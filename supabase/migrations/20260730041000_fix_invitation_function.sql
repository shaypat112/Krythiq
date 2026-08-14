create or replace function public.accept_team_invitation(invitation_token_hash text)
returns table(team_id uuid, team_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.team_invitations%rowtype;
  accepted_team_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select invitation_row.*
    into invitation
    from public.team_invitations as invitation_row
   where invitation_row.token_hash = invitation_token_hash
     and invitation_row.accepted_at is null
   for update;

  if not found or invitation.expires_at <= now() then
    raise exception 'This invitation is invalid or expired.' using errcode = '22023';
  end if;

  if lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(invitation.email) then
    raise exception 'Sign in with the email address that received this invitation.'
      using errcode = '42501';
  end if;

  update public.team_members as member
     set role = invitation.role
   where member.team_id = invitation.team_id
     and member.user_id = auth.uid();

  if not found then
    insert into public.team_members (team_id, user_id, role, created_at)
    values (invitation.team_id, auth.uid(), invitation.role, now());
  end if;

  update public.team_invitations as invitation_row
     set accepted_at = now()
   where invitation_row.id = invitation.id;

  select team.name
    into accepted_team_name
    from public.teams as team
   where team.id = invitation.team_id;

  return query select invitation.team_id, accepted_team_name;
end;
$$;

revoke all on function public.accept_team_invitation(text) from public, anon;
grant execute on function public.accept_team_invitation(text) to authenticated;
