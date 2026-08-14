begin;

delete from public.token_action_costs
where action = 'verification_run';

drop table if exists public.verification_runs;

commit;

