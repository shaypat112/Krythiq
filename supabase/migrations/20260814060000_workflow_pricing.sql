begin;

insert into public.token_action_costs (action, cost, label, enabled)
values ('agent_prompt', 5, 'Guided-fix agent prompts', true)
on conflict (action) do update
set cost = excluded.cost,
    label = excluded.label,
    enabled = true,
    updated_at = now();

-- These workflows are authenticated features, but no longer consume Tokens.
update public.token_action_costs
set enabled = false, updated_at = now()
where action in ('draft_patch', 'verification_run');

commit;
