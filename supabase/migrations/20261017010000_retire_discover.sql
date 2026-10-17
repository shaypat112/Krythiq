-- Retire Discover without destroying historical records or shared team functions.
-- The application no longer exposes its pages or API routes. Revoke direct
-- client access as well, since Supabase exposes public tables through PostgREST.
begin;

do $$
declare
  social_table text;
begin
  foreach social_table in array array[
    'social_projects', 'social_posts', 'social_reactions',
    'social_comments', 'social_connections', 'social_messages'
  ] loop
    if to_regclass(format('public.%I', social_table)) is not null then
      execute format('revoke all privileges on table public.%I from public, anon, authenticated', social_table);
    end if;

    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = social_table
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', social_table);
    end if;
  end loop;
end;
$$;

-- Keep uploaded objects private; only the administrative Storage API can
-- manage historical media after these client-facing policies are removed.
drop policy if exists social_media_insert_own on storage.objects;
drop policy if exists social_media_select_visible on storage.objects;
drop policy if exists social_media_delete_own on storage.objects;

notify pgrst, 'reload schema';
commit;
