-- Permite varias suscripciones del mismo cliente en una cuenta
alter table public.subscriptions
  drop constraint if exists subscriptions_id_account_id_client_key;
