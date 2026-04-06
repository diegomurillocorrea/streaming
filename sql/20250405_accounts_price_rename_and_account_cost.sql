-- Renombra price -> account_price_by_client (precio que paga cada cliente).
-- El costo de membresía mensual va en public.companies.membership_monthly_cost
-- (ver sql/20250406_membership_monthly_cost_on_companies.sql).

alter table public.accounts
  rename column price to account_price_by_client;

comment on column public.accounts.account_price_by_client is
  'Precio que cada cliente debe pagar por su cupo.';
