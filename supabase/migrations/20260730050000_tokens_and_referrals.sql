begin;

create table if not exists public.token_action_costs (
  action text primary key,
  cost integer not null check (cost > 0 and cost <= 100000),
  label text not null check (char_length(label) between 2 and 100),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.token_action_costs (action, cost, label)
values
  ('chat', 5, 'AI chat response'),
  ('ask_codebase', 10, 'Ask the codebase'),
  ('security_analysis', 15, 'Security analysis'),
  ('repository_intelligence', 20, 'Repository intelligence'),
  ('scan_low', 30, 'Low repository scan'),
  ('scan_mid', 50, 'Mid repository scan'),
  ('scan_high', 70, 'High repository scan'),
  ('architecture_health', 15, 'Architecture health'),
  ('attack_path', 20, 'Attack-path simulation'),
  ('remediation_plan', 25, 'Remediation plan')
on conflict (action) do update
set cost = excluded.cost, label = excluded.label, updated_at = now();

create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null check (amount <> 0 and abs(amount) <= 1000000),
  transaction_type text not null check (transaction_type in (
    'referral_reward', 'token_purchase', 'ai_generation',
    'admin_adjustment', 'refund'
  )),
  description text not null check (char_length(description) between 1 and 500),
  related_referral_id uuid,
  related_purchase_id text,
  related_usage_id uuid,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 200),
  created_at timestamptz not null default now()
);

create index if not exists token_transactions_user_created_idx
  on public.token_transactions (user_id, created_at desc);
create index if not exists token_transactions_user_type_idx
  on public.token_transactions (user_id, transaction_type);

create table if not exists public.ai_token_usages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null references public.token_action_costs(action),
  cost integer not null check (cost > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'refunded')),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 160),
  response_payload jsonb,
  error_message text check (error_message is null or char_length(error_message) <= 1000),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  refunded_at timestamptz,
  unique (user_id, idempotency_key)
);

create index if not exists ai_token_usages_user_created_idx
  on public.ai_token_usages (user_id, created_at desc);

alter table public.token_transactions
  add constraint token_transactions_usage_fk
  foreign key (related_usage_id) references public.ai_token_usages(id) on delete set null;

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Za-z0-9_-]{20,64}$'),
  reward_amount integer not null default 100 check (reward_amount between 1 and 100000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_invitations (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.referral_codes(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  normalized_email text not null check (char_length(normalized_email) between 3 and 320),
  email_hash text not null check (char_length(email_hash) = 64),
  status text not null default 'pending' check (status in (
    'pending', 'sent', 'claimed', 'qualified', 'expired', 'opted_out', 'blocked'
  )),
  sent_at timestamptz,
  claimed_at timestamptz,
  qualified_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  unique (inviter_id, email_hash)
);

create index if not exists referral_invitations_inviter_created_idx
  on public.referral_invitations (inviter_id, created_at desc);
create index if not exists referral_invitations_email_hash_idx
  on public.referral_invitations (email_hash);

create table if not exists public.referral_relationships (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.referral_codes(id) on delete restrict,
  invitation_id uuid not null unique references public.referral_invitations(id) on delete restrict,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'claimed' check (status in ('claimed', 'qualified', 'rewarded', 'rejected')),
  qualifying_usage_id uuid unique references public.ai_token_usages(id) on delete set null,
  claimed_at timestamptz not null default now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (referrer_id <> referred_user_id)
);

create index if not exists referral_relationships_referrer_idx
  on public.referral_relationships (referrer_id, created_at desc);

alter table public.token_transactions
  add constraint token_transactions_referral_fk
  foreign key (related_referral_id) references public.referral_relationships(id) on delete set null;

create table if not exists public.referral_request_attempts (
  id bigint generated always as identity primary key,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email_hash text not null check (char_length(email_hash) = 64),
  ip_hash text not null check (char_length(ip_hash) = 64),
  outcome text not null check (outcome in ('accepted', 'duplicate', 'blocked', 'rate_limited')),
  created_at timestamptz not null default now()
);

create index if not exists referral_attempts_inviter_created_idx
  on public.referral_request_attempts (inviter_id, created_at desc);
create index if not exists referral_attempts_email_created_idx
  on public.referral_request_attempts (email_hash, created_at desc);
create index if not exists referral_attempts_ip_created_idx
  on public.referral_request_attempts (ip_hash, created_at desc);

create table if not exists public.referral_opt_outs (
  email_hash text primary key check (char_length(email_hash) = 64),
  created_at timestamptz not null default now()
);

alter table public.token_action_costs enable row level security;
alter table public.token_action_costs force row level security;
alter table public.token_transactions enable row level security;
alter table public.token_transactions force row level security;
alter table public.ai_token_usages enable row level security;
alter table public.ai_token_usages force row level security;
alter table public.referral_codes enable row level security;
alter table public.referral_codes force row level security;
alter table public.referral_invitations enable row level security;
alter table public.referral_invitations force row level security;
alter table public.referral_relationships enable row level security;
alter table public.referral_relationships force row level security;
alter table public.referral_request_attempts enable row level security;
alter table public.referral_request_attempts force row level security;
alter table public.referral_opt_outs enable row level security;
alter table public.referral_opt_outs force row level security;

revoke all on public.token_action_costs, public.token_transactions,
  public.ai_token_usages, public.referral_codes, public.referral_invitations,
  public.referral_relationships, public.referral_request_attempts,
  public.referral_opt_outs from public, anon, authenticated;
revoke all on sequence public.referral_request_attempts_id_seq from public, anon, authenticated;

create policy token_transactions_select_own on public.token_transactions
  for select to authenticated using (user_id = (select auth.uid()));
create policy ai_token_usages_select_own on public.ai_token_usages
  for select to authenticated using (user_id = (select auth.uid()));
create policy referral_codes_select_own on public.referral_codes
  for select to authenticated using (user_id = (select auth.uid()));
create policy referral_invitations_select_own on public.referral_invitations
  for select to authenticated using (inviter_id = (select auth.uid()));
create policy referral_relationships_select_participant on public.referral_relationships
  for select to authenticated using (
    referrer_id = (select auth.uid()) or referred_user_id = (select auth.uid())
  );

grant select on public.token_transactions, public.ai_token_usages,
  public.referral_codes, public.referral_invitations,
  public.referral_relationships to authenticated;

create or replace function public.token_balance_for(target_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(amount), 0)::bigint
  from public.token_transactions
  where user_id = target_user_id;
$$;

create or replace function public.ensure_starter_tokens(target_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));
  insert into public.token_transactions (
    user_id, amount, transaction_type, description, idempotency_key
  )
  values (
    target_user_id, 100, 'admin_adjustment',
    'One-time starter token allocation',
    'starter:' || target_user_id::text
  )
  on conflict (idempotency_key) do nothing;
  return public.token_balance_for(target_user_id);
end;
$$;

create or replace function public.reserve_ai_tokens(
  target_user_id uuid,
  requested_action text,
  request_idempotency_key text
)
returns table(
  usage_id uuid,
  usage_status text,
  token_cost integer,
  balance bigint,
  cached_response jsonb,
  reservation_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_usage public.ai_token_usages%rowtype;
  action_cost integer;
  current_balance bigint;
  new_usage_id uuid;
begin
  if request_idempotency_key is null
    or char_length(request_idempotency_key) < 8
    or char_length(request_idempotency_key) > 160 then
    raise exception 'Invalid idempotency key.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));
  perform public.ensure_starter_tokens(target_user_id);

  select * into existing_usage
  from public.ai_token_usages
  where user_id = target_user_id and idempotency_key = request_idempotency_key;

  if found then
    return query select existing_usage.id, existing_usage.status,
      existing_usage.cost, public.token_balance_for(target_user_id),
      existing_usage.response_payload, false;
    return;
  end if;

  select cost into action_cost
  from public.token_action_costs
  where action = requested_action and enabled = true;
  if action_cost is null then
    raise exception 'Unknown or disabled token action.' using errcode = '22023';
  end if;

  current_balance := public.token_balance_for(target_user_id);
  if current_balance < action_cost then
    return query select null::uuid, 'insufficient'::text, action_cost,
      current_balance, null::jsonb, false;
    return;
  end if;

  insert into public.ai_token_usages (
    user_id, action, cost, status, idempotency_key
  )
  values (
    target_user_id, requested_action, action_cost, 'pending', request_idempotency_key
  )
  returning id into new_usage_id;

  insert into public.token_transactions (
    user_id, amount, transaction_type, description, related_usage_id,
    idempotency_key
  )
  values (
    target_user_id, -action_cost, 'ai_generation',
    'Token reservation for ' || requested_action, new_usage_id,
    'ai:' || target_user_id::text || ':' || request_idempotency_key
  );

  return query select new_usage_id, 'pending'::text, action_cost,
    public.token_balance_for(target_user_id), null::jsonb, true;
end;
$$;

create or replace function public.complete_ai_usage(
  target_user_id uuid,
  request_idempotency_key text,
  usable_response jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_usage public.ai_token_usages%rowtype;
  relationship public.referral_relationships%rowtype;
  reward integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  update public.ai_token_usages
  set status = 'completed', response_payload = usable_response,
      completed_at = coalesce(completed_at, now()), error_message = null
  where user_id = target_user_id
    and idempotency_key = request_idempotency_key
    and status = 'pending'
  returning * into completed_usage;

  if found then
    select * into relationship
    from public.referral_relationships
    where referred_user_id = target_user_id and status = 'claimed'
    for update;

    if found then
      select reward_amount into reward
      from public.referral_codes where id = relationship.code_id;

      update public.referral_relationships
      set status = 'rewarded', qualifying_usage_id = completed_usage.id,
          qualified_at = now(), rewarded_at = now()
      where id = relationship.id and status = 'claimed';

      update public.referral_invitations
      set status = 'qualified', qualified_at = now()
      where id = relationship.invitation_id;

      insert into public.token_transactions (
        user_id, amount, transaction_type, description,
        related_referral_id, related_usage_id, idempotency_key
      )
      values (
        relationship.referrer_id, reward, 'referral_reward',
        'Referral reward after first successful paid AI action',
        relationship.id, completed_usage.id,
        'referral_reward:' || relationship.id::text
      )
      on conflict (idempotency_key) do nothing;
    end if;
  end if;

  return public.token_balance_for(target_user_id);
end;
$$;

create or replace function public.refund_ai_usage(
  target_user_id uuid,
  request_idempotency_key text,
  failure_message text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  refunded_usage public.ai_token_usages%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  update public.ai_token_usages
  set status = 'refunded', refunded_at = now(),
      error_message = left(coalesce(failure_message, 'AI request failed'), 1000)
  where user_id = target_user_id
    and idempotency_key = request_idempotency_key
    and status = 'pending'
  returning * into refunded_usage;

  if found then
    insert into public.token_transactions (
      user_id, amount, transaction_type, description,
      related_usage_id, idempotency_key
    )
    values (
      target_user_id, refunded_usage.cost, 'refund',
      'Automatic refund for failed AI generation', refunded_usage.id,
      'refund:' || target_user_id::text || ':' || request_idempotency_key
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return public.token_balance_for(target_user_id);
end;
$$;

create or replace function public.claim_referral(
  target_user_id uuid,
  referral_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_email text;
  auth_created_at timestamptz;
  invitation public.referral_invitations%rowtype;
  referral_code_row public.referral_codes%rowtype;
begin
  select lower(email), created_at into auth_email, auth_created_at
  from auth.users
  where id = target_user_id and email_confirmed_at is not null;
  if auth_email is null then return false; end if;

  select * into referral_code_row
  from public.referral_codes as rc
  where rc.code = claim_referral.referral_code and rc.active = true;
  if not found or referral_code_row.user_id = target_user_id then return false; end if;

  select * into invitation
  from public.referral_invitations
  where code_id = referral_code_row.id
    and normalized_email = auth_email
    and status in ('pending', 'sent')
    and expires_at > now()
    and created_at <= auth_created_at
  for update;
  if not found then return false; end if;

  insert into public.referral_relationships (
    code_id, invitation_id, referrer_id, referred_user_id, status
  )
  values (
    referral_code_row.id, invitation.id, referral_code_row.user_id,
    target_user_id, 'claimed'
  )
  on conflict (referred_user_id) do nothing;

  if not found then return false; end if;

  update public.referral_invitations
  set status = 'claimed', claimed_at = now()
  where id = invitation.id;
  return true;
end;
$$;

revoke all on function public.token_balance_for(uuid) from public, anon, authenticated;
revoke all on function public.ensure_starter_tokens(uuid) from public, anon, authenticated;
revoke all on function public.reserve_ai_tokens(uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_ai_usage(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.refund_ai_usage(uuid, text, text) from public, anon, authenticated;
revoke all on function public.claim_referral(uuid, text) from public, anon, authenticated;
grant execute on function public.token_balance_for(uuid) to service_role;
grant execute on function public.ensure_starter_tokens(uuid) to service_role;
grant execute on function public.reserve_ai_tokens(uuid, text, text) to service_role;
grant execute on function public.complete_ai_usage(uuid, text, jsonb) to service_role;
grant execute on function public.refund_ai_usage(uuid, text, text) to service_role;
grant execute on function public.claim_referral(uuid, text) to service_role;

commit;
