do $$
begin
  if (select count(*) from public.ai_token_usages) <> 3 then raise exception 'Usage history must be preserved'; end if;
  if (select count(*) from public.token_action_costs where not enabled) <> 3 then raise exception 'All retired prices must be disabled'; end if;
  if not (select enabled from public.token_action_costs where action = 'security_analysis') then raise exception 'Active pricing must remain enabled'; end if;
  if to_regclass('public.change_drafts') is not null or to_regclass('public.remediation_items') is not null or to_regclass('public.launch_snapshots') is not null then raise exception 'Retired workflow tables must be removed'; end if;
  if to_regclass('public.repository_workspaces') is null then raise exception 'Active workspaces must be retained'; end if;
end $$;
