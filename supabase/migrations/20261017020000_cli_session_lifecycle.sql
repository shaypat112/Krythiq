begin;

alter table public.cli_access_tokens
  add column if not exists refresh_token_hash text unique,
  add column if not exists refresh_expires_at timestamptz;
alter table public.cli_device_codes
  add column if not exists terminal_name text not null default 'Krythiq CLI',
  add column if not exists session_version smallint not null default 1 check (session_version in (1,2));

-- Each refresh issues a short-lived access credential for the SAME terminal.
-- Overlapping credentials allow concurrent CLI processes to finish safely.
create table if not exists public.cli_access_credentials (
  token_hash text primary key check (char_length(token_hash) = 64),
  cli_token_id uuid not null references public.cli_access_tokens(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists cli_access_credentials_session_idx on public.cli_access_credentials(cli_token_id);
alter table public.cli_access_credentials enable row level security;
alter table public.cli_access_credentials force row level security;
revoke all on public.cli_access_credentials from public, anon, authenticated;
grant all on public.cli_access_credentials to service_role;

-- Revocation is server-owned. A browser must not be able to un-revoke a token,
-- extend its expiry, or read credential hashes through the public REST API.
drop policy if exists cli_access_tokens_own_revoke on public.cli_access_tokens;
revoke all on public.cli_access_tokens from public, anon, authenticated;
grant select (id, user_id, name, last_used_at, expires_at, revoked_at, created_at, refresh_expires_at)
  on public.cli_access_tokens to authenticated;

create or replace function public.claim_cli_device(p_device_hash text, p_access_hash text, p_refresh_hash text)
returns table(status text, user_id uuid, token_id uuid, expires_at timestamptz, refresh_expires_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_device public.cli_device_codes;
  v_session public.cli_access_tokens;
begin
  select * into v_device from public.cli_device_codes d where d.device_code_hash = p_device_hash for update;
  if not found or v_device.expires_at <= now() then
    return query select 'expired_token', null::uuid, null::uuid, null::timestamptz, null::timestamptz; return;
  end if;
  if v_device.status in ('denied', 'consumed') then
    return query select case when v_device.status = 'denied' then 'access_denied' else 'already_consumed' end, null::uuid, null::uuid, null::timestamptz, null::timestamptz; return;
  end if;
  if v_device.status <> 'approved' or v_device.user_id is null then
    return query select 'authorization_pending', null::uuid, null::uuid, null::timestamptz, null::timestamptz; return;
  end if;
  insert into public.cli_access_tokens(user_id, token_hash, name, expires_at, refresh_token_hash, refresh_expires_at)
    values(v_device.user_id, p_access_hash, left(v_device.terminal_name, 100),
      case when v_device.session_version = 2 then now() + interval '1 hour' else now() + interval '90 days' end,
      case when v_device.session_version = 2 then p_refresh_hash else null end,
      case when v_device.session_version = 2 then now() + interval '90 days' else null end) returning * into v_session;
  update public.cli_device_codes d set status = 'consumed' where d.id = v_device.id;
  return query select 'ok', v_session.user_id, v_session.id, v_session.expires_at, v_session.refresh_expires_at;
end;
$$;

create or replace function public.refresh_cli_session(p_refresh_hash text, p_access_hash text)
returns table(token_id uuid, expires_at timestamptz, refresh_expires_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_session public.cli_access_tokens;
begin
  select * into v_session from public.cli_access_tokens t
    where t.refresh_token_hash = p_refresh_hash and t.revoked_at is null and t.refresh_expires_at > now() for update;
  if not found then return; end if;
  delete from public.cli_access_credentials c where c.cli_token_id = v_session.id and c.expires_at <= now();
  insert into public.cli_access_credentials(token_hash, cli_token_id, expires_at)
    values(p_access_hash, v_session.id, least(now() + interval '1 hour', v_session.refresh_expires_at));
  return query select v_session.id, least(now() + interval '1 hour', v_session.refresh_expires_at), v_session.refresh_expires_at;
end;
$$;

create or replace function public.authenticate_cli_session(p_access_hash text)
returns table(user_id uuid, token_id uuid)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_session public.cli_access_tokens;
begin
  select * into v_session from public.cli_access_tokens t
    where t.token_hash = p_access_hash and t.revoked_at is null
      and (t.expires_at is null or t.expires_at > now())
      and (t.refresh_expires_at is null or t.refresh_expires_at > now());
  if not found then
    select t.* into v_session from public.cli_access_credentials c
      join public.cli_access_tokens t on t.id = c.cli_token_id
      where c.token_hash = p_access_hash and c.expires_at > now() and t.revoked_at is null and t.refresh_expires_at > now();
    if not found then return; end if;
  end if;
  update public.cli_access_tokens t set last_used_at = now() where t.id = v_session.id
    and (t.last_used_at is null or t.last_used_at < now() - interval '5 minutes');
  return query select v_session.user_id, v_session.id;
end;
$$;

create or replace function public.revoke_cli_session(p_access_hash text, p_refresh_hash text)
returns table(token_id uuid)
language sql security definer set search_path = public, pg_temp as $$
  update public.cli_access_tokens t set revoked_at = now()
    where t.revoked_at is null and (
      t.token_hash = p_access_hash or t.refresh_token_hash = p_refresh_hash or exists (
        select 1 from public.cli_access_credentials c where c.cli_token_id = t.id and c.token_hash = p_access_hash
      )
    ) returning t.id;
$$;

revoke all on function public.claim_cli_device(text,text,text) from public, anon, authenticated;
revoke all on function public.refresh_cli_session(text,text) from public, anon, authenticated;
revoke all on function public.authenticate_cli_session(text) from public, anon, authenticated;
revoke all on function public.revoke_cli_session(text,text) from public, anon, authenticated;
grant execute on function public.claim_cli_device(text,text,text) to service_role;
grant execute on function public.refresh_cli_session(text,text) to service_role;
grant execute on function public.authenticate_cli_session(text) to service_role;
grant execute on function public.revoke_cli_session(text,text) to service_role;
create or replace function public.cli_usage_summary(p_user_id uuid)
returns table(scan_count bigint, tokens_used bigint)
language sql security definer set search_path = public, pg_temp as $$
  select count(*), coalesce(sum(token_cost), 0)::bigint from public.cli_scan_events where user_id = p_user_id;
$$;
revoke all on function public.cli_usage_summary(uuid) from public, anon, authenticated;
grant execute on function public.cli_usage_summary(uuid) to service_role;
notify pgrst, 'reload schema';
commit;
