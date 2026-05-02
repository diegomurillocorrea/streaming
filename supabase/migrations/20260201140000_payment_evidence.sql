-- Evidencia de pago: referencia bancaria y/o archivo en Storage.
-- Ejecuta en Supabase SQL Editor o con `supabase db push` si usas CLI vinculado.

alter table public.payments
  add column if not exists payment_reference text null;

alter table public.payments
  add column if not exists receipt_storage_path text null;

comment on column public.payments.payment_reference is
  'Referencia de transferencia, depósito o nota corta (comprobante textual).';

comment on column public.payments.receipt_storage_path is
  'Ruta del objeto en el bucket `payment-receipts` (Supabase Storage).';

-- Bucket privado para comprobantes (imágenes / PDF).
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Lectura de comprobantes (p. ej. URL firmada desde el cliente autenticado).
drop policy if exists "payment_receipts_authenticated_select" on storage.objects;
create policy "payment_receipts_authenticated_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'payment-receipts');

drop policy if exists "payment_receipts_authenticated_insert" on storage.objects;
create policy "payment_receipts_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'payment-receipts');

drop policy if exists "payment_receipts_authenticated_update" on storage.objects;
create policy "payment_receipts_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'payment-receipts')
  with check (bucket_id = 'payment-receipts');

drop policy if exists "payment_receipts_authenticated_delete" on storage.objects;
create policy "payment_receipts_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'payment-receipts');
