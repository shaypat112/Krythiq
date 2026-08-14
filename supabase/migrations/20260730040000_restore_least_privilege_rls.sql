-- Restore application access after the security audit while keeping Postgres
-- deny-by-default. Application requests use the authenticated user's JWT; the
-- service role remains reserved for trusted server-only billing/admin work.

begin;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;

-- Bring the live schema in line with the fields used by the current app.
alter table public.user_settings
  add column if not exists data jsonb not null default '{}'::jsonb;
update public.user_settings
set data = coalesce(data, settings, '{}'::jsonb)
where data = '{}'::jsonb and settings is not null;

alter table public.team_environments
  add column if not exists repo_id uuid,
  add column if not exists provider text not null default 'github',
  add column if not exists github_owner text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1
      from public.teams
      where id = target_team_id and owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.team_members
      where team_id = target_team_id and user_id = auth.uid()
    )
  );
$$;

create or replace function public.can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1
      from public.teams
      where id = target_team_id and owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.team_members
      where team_id = target_team_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );
$$;

revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.can_manage_team(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.can_manage_team(uuid) to authenticated;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'profiles', 'scan_history', 'connected_repos', 'notifications',
    'notification_preferences', 'finding_reviews', 'activity_log',
    'webhook_endpoints', 'webhook_deliveries', 'teams', 'team_members',
    'integration_connections', 'user_settings', 'billing_customers',
    'team_environments', 'team_invitations', 'repositories', 'reviews',
    'repo_reviews', 'messages', 'review_flags', 'scans'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('alter table public.%I force row level security', table_name);
      for policy_name in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;
    end if;
  end loop;
end
$$;

-- Legacy tables are not used by the current application. Keep them completely
-- inaccessible to public application roles until a reviewed feature needs them.
revoke all on
  public.repositories,
  public.reviews,
  public.repo_reviews,
  public.messages,
  public.review_flags,
  public.scans
from authenticated;

-- Personal records: a JWT can only access rows tied to its own auth.uid().
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy scan_history_own on public.scan_history
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy connected_repos_own on public.connected_repos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_own on public.notifications
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy finding_reviews_own on public.finding_reviews
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy user_settings_own on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy activity_log_select_own on public.activity_log
  for select to authenticated using (actor_id = (select auth.uid()));
create policy activity_log_insert_own on public.activity_log
  for insert to authenticated with check (actor_id = (select auth.uid()));

create policy webhook_endpoints_own on public.webhook_endpoints
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy webhook_deliveries_own on public.webhook_deliveries
  for all to authenticated
  using (
    exists (
      select 1 from public.webhook_endpoints endpoint
      where endpoint.id = webhook_id and endpoint.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.webhook_endpoints endpoint
      where endpoint.id = webhook_id and endpoint.user_id = (select auth.uid())
    )
  );

-- Team records are visible to members; only owners/admins can mutate shared
-- membership, environments, invitations, or team-scoped preferences.
create policy teams_select_member on public.teams
  for select to authenticated using (public.is_team_member(id));
create policy teams_insert_owner on public.teams
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy teams_update_owner on public.teams
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy teams_delete_owner on public.teams
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy team_members_select_member on public.team_members
  for select to authenticated using (public.is_team_member(team_id));
create policy team_members_insert_manager on public.team_members
  for insert to authenticated with check (public.can_manage_team(team_id));
create policy team_members_update_manager on public.team_members
  for update to authenticated
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));
create policy team_members_delete_manager on public.team_members
  for delete to authenticated using (public.can_manage_team(team_id));

create policy team_environments_select_member on public.team_environments
  for select to authenticated using (public.is_team_member(team_id));
create policy team_environments_insert_manager on public.team_environments
  for insert to authenticated with check (public.can_manage_team(team_id));
create policy team_environments_update_manager on public.team_environments
  for update to authenticated
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));
create policy team_environments_delete_manager on public.team_environments
  for delete to authenticated using (public.can_manage_team(team_id));

create policy team_invitations_select_manager on public.team_invitations
  for select to authenticated using (public.can_manage_team(team_id));
create policy team_invitations_insert_manager on public.team_invitations
  for insert to authenticated
  with check (public.can_manage_team(team_id) and inviter_id = (select auth.uid()));
create policy team_invitations_delete_manager on public.team_invitations
  for delete to authenticated using (public.can_manage_team(team_id));

create policy integration_connections_own on public.integration_connections
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and (team_id is null or public.is_team_member(team_id))
  )
  with check (
    user_id = (select auth.uid())
    and (team_id is null or public.is_team_member(team_id))
  );

create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and (team_id is null or public.is_team_member(team_id))
  )
  with check (
    user_id = (select auth.uid())
    and (team_id is null or public.is_team_member(team_id))
  );

-- Billing state is readable by its owner but only trusted service-role code may
-- create or mutate it. This prevents users from assigning themselves a plan.
create policy billing_customers_select_own on public.billing_customers
  for select to authenticated using (user_id = (select auth.uid()));

-- Explicit table privileges are required in addition to RLS.
grant select on public.profiles to authenticated;
grant insert (id, full_name, username, avatar_url, updated_at) on public.profiles to authenticated;
grant update (full_name, username, avatar_url, updated_at) on public.profiles to authenticated;

grant select, insert, update, delete on
  public.scan_history,
  public.connected_repos,
  public.notifications,
  public.notification_preferences,
  public.finding_reviews,
  public.webhook_endpoints,
  public.webhook_deliveries,
  public.teams,
  public.team_members,
  public.integration_connections,
  public.user_settings,
  public.team_environments,
  public.team_invitations
to authenticated;

grant select, insert on public.activity_log to authenticated;
grant select on public.billing_customers to authenticated;

grant usage on all sequences in schema public to authenticated;

-- Security-definer invitation/team deletion functions remain callable only by
-- authenticated users and enforce auth.uid() internally.
revoke all on function public.delete_owned_team(uuid) from public, anon;
grant execute on function public.delete_owned_team(uuid) to authenticated;
revoke all on function public.accept_team_invitation(text) from public, anon;
grant execute on function public.accept_team_invitation(text) to authenticated;

commit;
