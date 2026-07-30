create or replace function public.delete_owned_team(target_team_id uuid)
returns table(deleted_id uuid, deleted_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_team_name text;
begin
  select name
    into owned_team_name
    from public.teams
   where id = target_team_id
     and owner_id = auth.uid()
   for update;

  if not found then
    raise exception 'Only the team owner can delete this team.'
      using errcode = '42501';
  end if;

  delete from public.notification_preferences where team_id = target_team_id;
  delete from public.integration_connections where team_id = target_team_id;
  delete from public.team_environments where team_id = target_team_id;
  delete from public.team_members where team_id = target_team_id;
  delete from public.teams
   where id = target_team_id
     and owner_id = auth.uid();

  return query select target_team_id, owned_team_name;
end;
$$;

revoke all on function public.delete_owned_team(uuid) from public;
grant execute on function public.delete_owned_team(uuid) to authenticated;
