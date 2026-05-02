-- Registra en tabla quién quedó con cobro incompleto en el mes que se estaba
-- cerrando (antes de avanzar service_start_date). Ejecutar en Supabase SQL Editor.
--
-- Nota: no reconstruye históricos pasados; a partir de aplicar esta migración,
-- cada ejecución de close_account_month deja filas en month_close_arrears.

create table if not exists public.month_close_arrears (
  id bigserial primary key,
  id_account bigint not null references public.accounts (id_account) on delete cascade,
  id_subscription bigint not null references public.subscriptions (id_subscription) on delete cascade,
  arrears_month date not null,
  amount_recorded numeric(10, 2),
  price_expected numeric(10, 2),
  recorded_at timestamptz not null default now(),
  unique (id_subscription, arrears_month)
);

create index if not exists idx_month_close_arrears_account_month
  on public.month_close_arrears (id_account, arrears_month desc);

comment on table public.month_close_arrears is
  'Suscripciones que al ejecutar close_account_month no tenían pago completo (monto vs precio cuenta) para el mes de facturación que se cerraba.';

alter table public.month_close_arrears enable row level security;

create policy "month_close_arrears_select_authenticated"
  on public.month_close_arrears for select
  to authenticated
  using (true);

create or replace function public.close_account_month(p_account_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  sub record;
  v_period int;
  v_start date;
  v_next_service date;
  v_next_paid date;
  v_last_bank bigint;
  v_processed int := 0;
  v_price numeric(10, 2);
  v_existing_amt numeric(10, 2);
  v_complete boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_account_id is null or p_account_id <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_account_id');
  end if;

  select a.account_price_by_client into v_price
  from public.accounts a
  where a.id_account = p_account_id;

  perform pg_advisory_xact_lock(872899, hashtext(p_account_id::text));

  if not exists (
    select 1 from public.subscriptions s where s.id_account = p_account_id
  ) then
    return jsonb_build_object(
      'ok', true,
      'subscriptions_processed', 0
    );
  end if;

  for sub in
    select
      s.id_subscription,
      s.service_start_date,
      greatest(
        1,
        coalesce(nullif(s.period_in_months, 0), 1)
      ) as period_m
    from public.subscriptions s
    where s.id_account = p_account_id
    order by s.id_subscription
    for update of s
  loop
    v_period := sub.period_m;
    v_start := coalesce(sub.service_start_date, current_date);
    v_next_service := (v_start + (v_period::text || ' months')::interval)::date;
    v_next_paid := date_trunc('month', v_next_service::timestamp)::date;

    select p.amount into v_existing_amt
    from public.payments p
    where p.id_subscription = sub.id_subscription
      and p.paid_month = v_next_paid;

    if v_price is null or v_price <= 0 then
      v_complete := coalesce(v_existing_amt, 0) > 0;
    else
      v_complete := coalesce(v_existing_amt, 0) >= v_price;
    end if;

    if not v_complete then
      insert into public.month_close_arrears (
        id_account,
        id_subscription,
        arrears_month,
        amount_recorded,
        price_expected
      )
      values (
        p_account_id,
        sub.id_subscription,
        v_next_paid,
        coalesce(v_existing_amt, 0),
        v_price
      )
      on conflict (id_subscription, arrears_month) do nothing;
    end if;

    select p.id_bank_account into v_last_bank
    from public.payments p
    where p.id_subscription = sub.id_subscription
      and p.id_bank_account is not null
    order by
      coalesce(p.paid_month, (p.payment_date at time zone 'utc')::date) desc nulls last
    limit 1;

    if v_last_bank is null then
      select p.id_bank_account into v_last_bank
      from public.payments p
      where p.id_subscription = sub.id_subscription
      order by
        coalesce(p.paid_month, (p.payment_date at time zone 'utc')::date) desc nulls last
      limit 1;
    end if;

    update public.subscriptions
    set service_start_date = v_next_service
    where id_subscription = sub.id_subscription;

    insert into public.payments (
      id_subscription,
      id_bank_account,
      amount,
      payment_date,
      paid_month
    )
    values (
      sub.id_subscription,
      v_last_bank,
      0,
      now(),
      v_next_paid
    );

    v_processed := v_processed + 1;
  end loop;

  insert into public.month_close_events (
    id_account,
    actor_id,
    status,
    subscriptions_processed
  )
  values (
    p_account_id,
    v_uid,
    'success',
    v_processed
  );

  return jsonb_build_object(
    'ok', true,
    'subscriptions_processed', v_processed
  );
exception
  when others then
    insert into public.month_close_events (
      id_account,
      actor_id,
      status,
      subscriptions_processed,
      error_message
    )
    values (
      p_account_id,
      v_uid,
      'error',
      0,
      sqlerrm
    );

    return jsonb_build_object(
      'ok', false,
      'error', sqlerrm,
      'subscriptions_processed', 0
    );
end;
$$;

comment on function public.close_account_month(bigint) is
  'Cierra el mes: registra pendientes en month_close_arrears, avanza service_start_date e inserta pago en 0.';
