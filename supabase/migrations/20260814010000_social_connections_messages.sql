begin;

create extension if not exists pgcrypto;

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists social_connections_unique_pair_idx
  on public.social_connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists social_connections_requester_idx on public.social_connections(requester_id, status);
create index if not exists social_connections_addressee_idx on public.social_connections(addressee_id, status);

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_messages_conversation_idx
  on public.social_messages(connection_id, created_at asc);
create index if not exists social_messages_unread_idx
  on public.social_messages(connection_id, sender_id, read_at) where read_at is null;

alter table public.social_connections enable row level security;
alter table public.social_connections force row level security;
alter table public.social_messages enable row level security;
alter table public.social_messages force row level security;

drop policy if exists social_connections_participant_read on public.social_connections;
drop policy if exists social_connections_request on public.social_connections;
drop policy if exists social_connections_addressee_update on public.social_connections;
drop policy if exists social_connections_participant_delete on public.social_connections;
create policy social_connections_participant_read on public.social_connections
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy social_connections_request on public.social_connections
  for insert to authenticated with check (requester_id = auth.uid() and status = 'pending');
create policy social_connections_addressee_update on public.social_connections
  for update to authenticated using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status in ('accepted', 'declined'));
create policy social_connections_participant_delete on public.social_connections
  for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

drop policy if exists social_messages_participant_read on public.social_messages;
drop policy if exists social_messages_participant_insert on public.social_messages;
drop policy if exists social_messages_recipient_update on public.social_messages;
create policy social_messages_participant_read on public.social_messages
  for select to authenticated using (exists (
    select 1 from public.social_connections connection
    where connection.id = connection_id and connection.status = 'accepted'
      and auth.uid() in (connection.requester_id, connection.addressee_id)
  ));
create policy social_messages_participant_insert on public.social_messages
  for insert to authenticated with check (sender_id = auth.uid() and exists (
    select 1 from public.social_connections connection
    where connection.id = connection_id and connection.status = 'accepted'
      and auth.uid() in (connection.requester_id, connection.addressee_id)
  ));
create policy social_messages_recipient_update on public.social_messages
  for update to authenticated using (sender_id <> auth.uid() and exists (
    select 1 from public.social_connections connection
    where connection.id = connection_id and connection.status = 'accepted'
      and auth.uid() in (connection.requester_id, connection.addressee_id)
  )) with check (sender_id <> auth.uid());

grant select, insert, update, delete on public.social_connections to authenticated;
grant select, insert, update on public.social_messages to authenticated;

create or replace function public.add_team_member_by_user_id(target_team_id uuid, target_user_id uuid)
returns public.team_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  added_member public.team_members;
begin
  if auth.uid() is null or not public.can_manage_team(target_team_id) then
    raise exception 'Only team admins can add members.' using errcode = '42501';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You are already on this team.' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.teams where id = target_team_id and owner_id = target_user_id) then
    raise exception 'This user is already the team owner.' using errcode = '23505';
  end if;

  select * into added_member from public.team_members
  where team_id = target_team_id and user_id = target_user_id
  limit 1;
  if found then
    return added_member;
  end if;

  insert into public.team_members (team_id, user_id, role, created_at)
  values (target_team_id, target_user_id, 'member', now())
  returning * into added_member;
  return added_member;
end;
$$;

revoke all on function public.add_team_member_by_user_id(uuid, uuid) from public, anon;
grant execute on function public.add_team_member_by_user_id(uuid, uuid) to authenticated;

alter table public.notification_preferences drop constraint if exists notification_preferences_event_check;
alter table public.notification_preferences add constraint notification_preferences_event_check check (event in (
  'scan.completed', 'vulnerability.critical', 'dependency.vulnerable',
  'repository.connection_failed', 'integration.error', 'scan.summary_ready',
  'report.weekly', 'deployment.failed', 'token.requested', 'token.approved',
  'token.rejected', 'token.refund_requested', 'team.invited', 'team.joined',
  'repository.synced', 'billing.updated', 'social.follow_requested',
  'social.follow_accepted', 'social.message_received'
));

alter table public.social_messages replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'social_messages'
  ) then
    alter publication supabase_realtime add table public.social_messages;
  end if;
end $$;

commit;
