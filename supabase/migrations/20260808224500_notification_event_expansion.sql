begin;

alter table public.notification_preferences
  drop constraint if exists notification_preferences_event_check;

alter table public.notification_preferences
  add constraint notification_preferences_event_check check (event in (
    'scan.completed', 'vulnerability.critical', 'dependency.vulnerable',
    'repository.connection_failed', 'integration.error', 'scan.summary_ready',
    'report.weekly', 'deployment.failed', 'token.requested', 'token.approved',
    'token.rejected', 'token.refund_requested', 'team.invited', 'team.joined',
    'repository.synced', 'billing.updated'
  ));

commit;
