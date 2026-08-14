begin;

create table if not exists public.token_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null) or
    (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create unique index if not exists token_requests_one_pending_per_user
  on public.token_requests (user_id)
  where status = 'pending';

create index if not exists token_requests_status_created_idx
  on public.token_requests (status, created_at desc);

alter table public.token_requests enable row level security;
alter table public.token_requests force row level security;

revoke all on public.token_requests from public, anon, authenticated;
grant select on public.token_requests to authenticated;

create policy token_requests_select_own
  on public.token_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.review_token_request(
  request_id uuid,
  reviewer_id uuid,
  decision text
)
returns public.token_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed_request public.token_requests%rowtype;
begin
  if decision not in ('approved', 'rejected') then
    raise exception 'Invalid token request decision';
  end if;

  select *
    into reviewed_request
  from public.token_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Token request not found';
  end if;
  if reviewed_request.status <> 'pending' then
    raise exception 'Token request was already reviewed';
  end if;

  update public.token_requests
  set status = decision,
      reviewed_by = reviewer_id,
      reviewed_at = now()
  where id = request_id
  returning * into reviewed_request;

  if decision = 'approved' then
    insert into public.token_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      idempotency_key
    )
    values (
      reviewed_request.user_id,
      reviewed_request.amount,
      'admin_adjustment',
      'Admin-approved test Token request',
      'token-request:' || reviewed_request.id::text
    )
    on conflict (idempotency_key) do nothing;
  end if;

  return reviewed_request;
end;
$$;

revoke all on function public.review_token_request(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.review_token_request(uuid, uuid, text)
  to service_role;

commit;
