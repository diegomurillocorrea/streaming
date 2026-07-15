-- Prepago: un pago cubre N meses calendario desde paid_month (ancla).
-- El monto se guarda una sola vez; months_covered define la ventana de cobertura.

alter table public.payments
  add column if not exists months_covered integer not null default 1;

alter table public.payments
  drop constraint if exists payments_months_covered_check;

alter table public.payments
  add constraint payments_months_covered_check
  check (months_covered > 0 and months_covered <= 24);

comment on column public.payments.months_covered is
  'Cantidad de meses calendario que cubre este pago desde paid_month (ancla). Monto total en amount, sin repartir.';

-- Filas existentes: cobertura de 1 mes (comportamiento previo por fila).
update public.payments
set months_covered = 1
where months_covered is null or months_covered < 1;
