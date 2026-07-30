begin;

insert into public.token_action_costs (action, cost, label, enabled)
values
  ('scan_low', 30, 'Low repository scan', true),
  ('scan_mid', 50, 'Mid repository scan', true),
  ('scan_high', 70, 'High repository scan', true)
on conflict (action) do update
set cost = excluded.cost,
    label = excluded.label,
    enabled = true,
    updated_at = now();

update public.token_action_costs
set enabled = false, updated_at = now()
where action in ('scan_medium', 'scan_all');

commit;
