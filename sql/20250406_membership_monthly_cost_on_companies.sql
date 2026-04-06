-- Costo de membresía mensual por servicio: vive en public.companies (empresas).
-- Si existía accounts.account_cost, copia a companies y elimina la columna en accounts.
--
-- Regla de consolidación: por id_company se usa max(account_cost) entre cuentas
-- (si tenías el mismo costo en todas, el resultado es ese valor; si diferían, queda el mayor).

alter table public.companies
  add column if not exists membership_monthly_cost numeric(10, 2) null;

alter table public.companies
  drop constraint if exists companies_membership_monthly_cost_non_negative;

alter table public.companies
  add constraint companies_membership_monthly_cost_non_negative
  check (membership_monthly_cost is null or membership_monthly_cost >= 0);

comment on column public.companies.membership_monthly_cost is
  'Costo de comprar la membresía mensual en la plataforma (por servicio/empresa).';

do $body$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'accounts'
      and column_name = 'account_cost'
  ) then
    update public.companies c
    set membership_monthly_cost = sub.v
    from (
      select
        a.id_company,
        (max(a.account_cost))::numeric(10, 2) as v
      from public.accounts a
      where a.id_company is not null
        and a.account_cost is not null
      group by a.id_company
    ) sub
    where c.id_company = sub.id_company;

    alter table public.accounts
      drop constraint if exists accounts_account_cost_non_negative;

    alter table public.accounts
      drop column account_cost;
  end if;
end
$body$;
