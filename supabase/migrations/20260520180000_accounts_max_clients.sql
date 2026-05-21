-- Cupos máximos por cuenta (suscripciones permitidas). Validado en la app (1–10, default 5).

alter table public.accounts
  add column if not exists max_clients integer not null default 5
    check (max_clients between 1 and 10);

comment on column public.accounts.max_clients is
  'Cantidad máxima de suscripciones (cupos) permitidas en esta cuenta. Rango 1–10.';
