-- Safe mock-account cleanup. This intentionally deletes ONLY accounts explicitly
-- marked as mock/test data; it never guesses from a person's display name.
begin;

create temporary table mock_user_ids on commit drop as
select id from auth.users
where coalesce(raw_user_meta_data ->> 'is_mock', 'false') = 'true'
   or coalesce(raw_user_meta_data ->> 'account_type', '') in ('mock', 'seed', 'demo')
   or lower(coalesce(email, '')) like '%@mock.krythiq.local'
   or lower(coalesce(email, '')) like '%@example.invalid';

delete from storage.objects where bucket_id = 'social-media' and owner_id in (select id::text from mock_user_ids);
delete from auth.users where id in (select id from mock_user_ids);

-- Profiles, posts, comments, reactions, and memberships cascade through their
-- auth.users foreign keys where configured.
commit;
