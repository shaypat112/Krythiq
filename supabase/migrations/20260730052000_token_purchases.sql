begin;

create table if not exists public.token_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text not null unique
    check (char_length(stripe_checkout_session_id) between 8 and 255),
  stripe_payment_intent_id text unique,
  pack_id text not null check (pack_id in ('starter', 'builder', 'scale')),
  token_amount bigint not null check (token_amount > 0 and token_amount <= 1000000),
  amount_paid bigint not null check (amount_paid >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  created_at timestamptz not null default now()
);

create index if not exists token_purchases_user_created_idx
  on public.token_purchases (user_id, created_at desc);

alter table public.token_purchases enable row level security;
alter table public.token_purchases force row level security;

revoke all on public.token_purchases from public, anon, authenticated;
grant select on public.token_purchases to authenticated;

create policy token_purchases_select_own on public.token_purchases
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.credit_token_purchase(
  target_user_id uuid,
  checkout_session_id text,
  payment_intent_id text,
  purchased_pack_id text,
  purchased_tokens bigint,
  paid_amount bigint,
  paid_currency text
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_rows integer := 0;
  resulting_balance bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if purchased_pack_id not in ('starter', 'builder', 'scale')
    or purchased_tokens <= 0 or purchased_tokens > 1000000
    or paid_amount < 0 or paid_currency !~ '^[a-z]{3}$' then
    raise exception 'Invalid token purchase';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  insert into public.token_purchases (
    user_id, stripe_checkout_session_id, stripe_payment_intent_id,
    pack_id, token_amount, amount_paid, currency
  )
  values (
    target_user_id, checkout_session_id, nullif(payment_intent_id, ''),
    purchased_pack_id, purchased_tokens, paid_amount, lower(paid_currency)
  )
  on conflict (stripe_checkout_session_id) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows = 1 then
    insert into public.token_transactions (
      user_id, amount, transaction_type, description,
      related_purchase_id, idempotency_key
    )
    values (
      target_user_id, purchased_tokens, 'token_purchase',
      'Stripe token purchase', checkout_session_id,
      'stripe_token_purchase:' || checkout_session_id
    );
  end if;

  select coalesce(sum(amount), 0)::bigint
    into resulting_balance
    from public.token_transactions
    where user_id = target_user_id;

  return resulting_balance;
end;
$$;

revoke all on function public.credit_token_purchase(
  uuid, text, text, text, bigint, bigint, text
) from public, anon, authenticated;
grant execute on function public.credit_token_purchase(
  uuid, text, text, text, bigint, bigint, text
) to service_role;

commit;
