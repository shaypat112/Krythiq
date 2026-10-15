begin;

-- Retire guided prompt generation and the former launch workflow.
-- Token transactions retain their action strings for historical billing records.
delete from public.token_action_costs
where action in ('agent_prompt', 'draft_patch', 'verification_run');

-- These tables belonged to the retired workflow. The active repository editor
-- uses repository_workspaces and workspace_files, which are retained.
drop table if exists public.change_drafts;
drop table if exists public.remediation_items;
drop table if exists public.launch_snapshots;

commit;
