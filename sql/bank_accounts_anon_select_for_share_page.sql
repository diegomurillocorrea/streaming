-- Lectura pública de `bank_accounts` para la ruta
-- `/administration/bank-accounts/share` (clientes sin iniciar sesión).
--
-- Si la página muestra error de permisos o lista vacía con mensaje de RLS,
-- ejecuta este script en Supabase (ajusta si ya tienes políticas en esta tabla).
--
-- Seguridad: cualquiera con la URL podrá leer nombre de titular, banco y número.

alter table public.bank_accounts enable row level security;

drop policy if exists "bank_accounts_select_anon_share" on public.bank_accounts;

create policy "bank_accounts_select_anon_share"
  on public.bank_accounts
  for select
  to anon
  using (true);

-- Administradores con sesión (JWT): mantener CRUD desde el panel de la app.
drop policy if exists "bank_accounts_authenticated_all" on public.bank_accounts;

create policy "bank_accounts_authenticated_all"
  on public.bank_accounts
  for all
  to authenticated
  using (true)
  with check (true);

-- Si ya tenías otras políticas en esta tabla, revísalas para evitar conflictos
-- (p. ej. elimina duplicados o ajusta nombres).
