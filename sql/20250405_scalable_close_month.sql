-- Ejecutar en Supabase → SQL Editor (pegar el archivo completo, una sola vez).
--
-- Requisito: el proyecto ya usa tablas public.accounts, public.subscriptions, public.payments.
-- Tras aplicar: nuevas suscripciones pueden enviar subscription_started_at (ver AddClientButton).
-- El botón "Cerrar mes" llama a la RPC close_account_month desde el servidor (Next.js).
--
-- Escalabilidad: ancla de alta inmutable, índice único (suscripción + mes), cierre atómico, auditoría.

-- ---------------------------------------------------------------------------
-- 1) subscription_started_at: fecha de alta inmutable (no se mueve al cerrar mes)
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists subscription_started_at date;

update public.subscriptions
set subscription_started_at = coalesce(subscription_started_at, service_start_date, current_date)
where subscription_started_at is null;

alter table public.subscriptions
  alter column subscription_started_at set not null;

comment on column public.subscriptions.subscription_started_at is
  'Fecha de inicio original de la suscripción; no debe cambiar al cerrar mes.';

-- Trigger INSERT: si no viene explícito, copiar service_start_date
create or replace function public.trg_subscriptions_set_started_at()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_started_at is null then
    new.subscription_started_at := coalesce(new.service_start_date, current_date);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_subscriptions_set_started_at on public.subscriptions;
create trigger trg_subscriptions_set_started_at
  before insert on public.subscriptions
  for each row
  execute procedure public.trg_subscriptions_set_started_at();

-- Trigger UPDATE: impedir cambiar subscription_started_at desde el cliente
create or replace function public.trg_subscriptions_preserve_started_at()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_started_at is distinct from old.subscription_started_at then
    new.subscription_started_at := old.subscription_started_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_subscriptions_preserve_started_at on public.subscriptions;
create trigger trg_subscriptions_preserve_started_at
  before update on public.subscriptions
  for each row
  execute procedure public.trg_subscriptions_preserve_started_at();

-- ---------------------------------------------------------------------------
-- 2) Un solo pago “placeholder” por suscripción y mes (paid_month)
-- ---------------------------------------------------------------------------
delete from public.payments a
  using public.payments b
where a.id_payment < b.id_payment
  and a.id_subscription = b.id_subscription
  and a.paid_month is not null
  and b.paid_month is not null
  and a.paid_month = b.paid_month;

create unique index if not exists payments_id_subscription_paid_month_key
  on public.payments (id_subscription, paid_month)
  where paid_month is not null;

create index if not exists idx_payments_id_subscription
  on public.payments (id_subscription);

create index if not exists idx_subscriptions_id_account
  on public.subscriptions (id_account);

-- ---------------------------------------------------------------------------
-- 3) Auditoría de cierres de mes
-- ---------------------------------------------------------------------------
create table if not exists public.month_close_events (
  id bigserial primary key,
  id_account bigint not null references public.accounts (id_account) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  finished_at timestamptz not null default now(),
  status text not null check (status in ('success', 'error')),
  subscriptions_processed int not null default 0,
  error_message text
);

comment on table public.month_close_events is
  'Registro de ejecuciones de close_account_month por cuenta.';

create index if not exists idx_month_close_events_account
  on public.month_close_events (id_account, finished_at desc);

alter table public.month_close_events enable row level security;

-- Sin políticas: solo acceso vía service role / owner; la RPC SECURITY DEFINER inserta.
revoke all on public.month_close_events from public;
grant select on public.month_close_events to service_role;

-- ---------------------------------------------------------------------------
-- 4) RPC transaccional: mismo comportamiento que FinishMonthButton (TS)
-- ---------------------------------------------------------------------------
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
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_account_id is null or p_account_id <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_account_id');
  end if;

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
  'Cierra el mes para todas las suscripciones de la cuenta: avanza service_start_date e inserta pago en 0.';

revoke all on function public.close_account_month(bigint) from public;
grant execute on function public.close_account_month(bigint) to authenticated;
grant execute on function public.close_account_month(bigint) to service_role;
