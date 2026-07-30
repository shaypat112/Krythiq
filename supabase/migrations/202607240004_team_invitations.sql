create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  role text not null default 'member' check (role in ('member', 'admin')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists team_invitations_pending_email_idx
  on public.team_invitations (team_id, lower(email))
  where accepted_at is null;

alter table public.team_invitations enable row level security;

create or replace function public.accept_team_invitation(invitation_token_hash text)
returns table(team_id uuid, team_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.team_invitations%rowtype;
  accepted_team_name text;
begin
  select *
    into invitation
    from public.team_invitations
   where token_hash = invitation_token_hash
     and accepted_at is null
   for update;

  if not found or invitation.expires_at <= now() then
    raise exception 'This invitation is invalid or expired.' using errcode = '22023';
  end if;

  if lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(invitation.email) then
    raise exception 'Sign in with the email address that received this invitation.'
      using errcode = '42501';
  end if;

  insert into public.team_members (team_id, user_id, role, created_at)
  values (invitation.team_id, auth.uid(), invitation.role, now())
  on conflict (team_id, user_id) do update set role = excluded.role;

  update public.team_invitations
     set accepted_at = now()
   where id = invitation.id;

  select name into accepted_team_name from public.teams where id = invitation.team_id;
  return query select invitation.team_id, accepted_team_name;
end;
$$;

revoke all on function public.accept_team_invitation(text) from public;
grant execute on function public.accept_team_invitation(text) to authenticated;
