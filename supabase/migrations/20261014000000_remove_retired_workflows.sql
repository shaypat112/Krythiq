begin;

-- Retire guided prompt generation and the former launch workflow.
-- Historical ai_token_usages reference these rows through a foreign key.
-- Disable new reservations while retaining the pricing and usage audit trail.
update public.token_action_costs
set enabled = false, updated_at = now()
where action in ('agent_prompt', 'draft_patch', 'verification_run');

-- These tables belonged to the retired workflow. The active repository editor
-- uses repository_workspaces and workspace_files, which are retained.
drop table if exists public.change_drafts;
drop table if exists public.remediation_items;
drop table if exists public.launch_snapshots;

commit;
