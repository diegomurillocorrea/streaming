-- Ejecutar en Supabase → SQL Editor (o psql).
-- Añade si la cuenta debe mostrar la columna PIN en /administration/subscriptions/[id]

alter table public.accounts
  add column if not exists pin_included boolean not null default true;

comment on column public.accounts.pin_included is
  'Si es true, la vista de suscripciones muestra la columna PIN por cliente.';
