-- Safe mock-account cleanup. This intentionally deletes ONLY accounts explicitly
-- marked as mock/test data; it never guesses from a person's display name.
begin;

create temporary table mock_user_ids on commit drop as
select id from auth.users
where coalesce(raw_user_meta_data ->> 'is_mock', 'false') = 'true'
   or coalesce(raw_user_meta_data ->> 'account_type', '') in ('mock', 'seed', 'demo')
   or lower(coalesce(email, '')) like '%@mock.krythiq.local'
   or lower(coalesce(email, '')) like '%@example.invalid';

-- Storage now rejects SQL deletes, even when the predicate matches no rows.
-- Remove files through the Storage API before deleting accounts that own them.
do $$
begin
  if exists (
    select 1 from storage.objects
    where bucket_id = 'social-media' and owner_id in (select id::text from mock_user_ids)
  ) then
    raise exception 'Remove mock users'' social-media objects through the Storage API before running this migration.';
  end if;
end $$;
delete from auth.users where id in (select id from mock_user_ids);

-- Profiles, posts, comments, reactions, and memberships cascade through their
-- auth.users foreign keys where configured.
commit;
