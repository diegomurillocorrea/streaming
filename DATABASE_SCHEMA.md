# Database Schema (Supabase / Postgres)

This is the recommended schema for the current Streaming app based on how the code is querying data today.

## Overview

The system is centered around:

- `accounts` (streaming accounts like Netflix/Disney/etc)
- `clients` (people using a slot in an account)
- `subscriptions` (link between client and account)
- `payments` (money collected per subscription and month)

Support tables:

- `companies`, `emails` (metadata for each account)
- `bank_accounts` (where payments are received)
- `cards`, `payment_networks`, `card_types` (card management)

## Entity Relationship Summary

- One `company` has many `accounts`
- One `email` can be used by many `accounts`
- One `account` has many `subscriptions` (including multiple rows for the same `client`), capped by `accounts.max_clients` (1–10, default 5; enforced in the app)
- One `client` can have many `subscriptions` (across accounts or repeated on the same account)
- One `subscription` has many `payments`
- One `bank_account` can be used in many `payments`
- One `payment_network` has many `cards`
- One `card_type` has many `cards`

## Recommended SQL Schema

```sql
-- Required extension for case-insensitive unique email checks
create extension if not exists citext;

-- -----------------------------------------
-- Reference tables
-- -----------------------------------------

create table if not exists companies (
  id_company bigserial primary key,
  company_name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists emails (
  id_email bigserial primary key,
  email_address citext not null unique,
  created_at timestamptz not null default now()
);

create table if not exists bank_accounts (
  id_bank_account bigserial primary key,
  account_name text not null,
  account_number text not null,
  bank_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists payment_networks (
  id_payment_network bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists card_types (
  id_card_type bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

-- -----------------------------------------
-- Core business tables
-- -----------------------------------------

create table if not exists clients (
  id_client bigserial primary key,
  name text not null,
  "lastName" text not null,
  email citext null,
  "phoneNumber" text null,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id_account bigserial primary key,
  id_company bigint null references companies(id_company) on delete set null,
  id_email bigint null references emails(id_email) on delete set null,
  account_name text not null,
  password text not null default '',
  payment_date date null,
  price numeric(10, 2) null check (price is null or price >= 0),
  max_clients integer not null default 5 check (max_clients between 1 and 10),
  created_at timestamptz not null default now(),
  unique (account_name, id_company)
);

create table if not exists subscriptions (
  id_subscription bigserial primary key,
  id_account bigint not null references accounts(id_account) on delete cascade,
  id_client bigint not null references clients(id_client) on delete cascade,
  "user" text null,
  pin text null check (pin is null or pin ~ '^\d{0,4}$'),
  service_start_date date null,
  service_end_date date null,
  period_in_months integer null check (period_in_months is null or period_in_months > 0),
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id_payment bigserial primary key,
  id_subscription bigint not null references subscriptions(id_subscription) on delete cascade,
  id_bank_account bigint null references bank_accounts(id_bank_account) on delete set null,
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  payment_date timestamptz not null default now(),
  paid_month date not null,
  payment_reference text null,
  receipt_storage_path text null,
  created_at timestamptz not null default now(),
  unique (id_subscription, paid_month)
);

create table if not exists cards (
  id_card bigserial primary key,
  owner_name text not null,
  card_number text not null,
  id_payment_network bigint not null references payment_networks(id_payment_network) on delete restrict,
  id_card_type bigint not null references card_types(id_card_type) on delete restrict,
  "expirationDate" date not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------
-- Indexes for performance
-- -----------------------------------------

create index if not exists idx_accounts_company on accounts(id_company);
create index if not exists idx_accounts_email on accounts(id_email);

create index if not exists idx_subscriptions_account on subscriptions(id_account);
create index if not exists idx_subscriptions_client on subscriptions(id_client);

create index if not exists idx_payments_subscription on payments(id_subscription);
create index if not exists idx_payments_bank on payments(id_bank_account);
create index if not exists idx_payments_paid_month on payments(paid_month);
create index if not exists idx_payments_subscription_month on payments(id_subscription, paid_month desc);

create index if not exists idx_cards_payment_network on cards(id_payment_network);
create index if not exists idx_cards_card_type on cards(id_card_type);
```

### Tabla opcional: pendientes al cerrar mes (`month_close_arrears`)

Creada por la migración `supabase/migrations/20260201153000_month_close_arrears_snapshot.sql`.
Guarda, por cada ejecución de `close_account_month`, las suscripciones que **no**
tenían el monto completo vs `accounts.account_price_by_client` para el mes que se
estaba cerrando (`arrears_month`). Ejemplo:

`select * from month_close_arrears where id_account = <id> order by arrears_month desc;`

## Notes About Current App Compatibility

- The app currently uses mixed column naming (`snake_case` plus `lastName`, `phoneNumber`, `expirationDate`, and reserved-like `user`).
- The schema above keeps those names so it works with your current code without refactors.
- If you want to standardize everything to `snake_case`, do it in a separate migration and update the frontend queries at the same time.

## Optional Improvements (Next Step)

- Add Row Level Security policies per authenticated user/role.
- Encrypt sensitive fields (`accounts.password`, `cards.card_number`) or avoid storing raw values.
- Add audit columns (`updated_at`, `created_by`, `updated_by`) if you need traceability.
- La tabla `month_close_arrears` y la RPC actualizada están en `supabase/migrations/20260201153000_month_close_arrears_snapshot.sql` (snapshots al usar **Cerrar mes**).
