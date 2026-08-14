-- Copy/paste-safe repair for Explore. Re-running this migration is supported.
begin;

create extension if not exists pgcrypto;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists (select 1 from public.teams where id = target_team_id and owner_id = auth.uid())
    or exists (select 1 from public.team_members where team_id = target_team_id and user_id = auth.uid())
  );
$$;

create or replace function public.can_manage_team(target_team_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists (select 1 from public.teams where id = target_team_id and owner_id = auth.uid())
    or exists (select 1 from public.team_members where team_id = target_team_id and user_id = auth.uid() and role in ('owner', 'admin'))
  );
$$;

revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.can_manage_team(uuid) from public, anon;
grant execute on function public.is_team_member(uuid), public.can_manage_team(uuid) to authenticated;

create table if not exists public.social_projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  team_name text not null check (char_length(team_name) between 1 and 200),
  created_by uuid not null references auth.users(id) on delete cascade,
  repository text not null check (char_length(repository) between 3 and 300),
  name text not null check (char_length(name) between 1 and 200),
  description text check (description is null or char_length(description) <= 1000),
  pinned boolean not null default true,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified','expired','revoked')),
  verified_at timestamptz,
  verification_expires_at timestamptz,
  scan_created_at timestamptz,
  scan_score integer check (scan_score is null or scan_score between 0 and 100),
  scan_issues integer check (scan_issues is null or scan_issues >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, repository)
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 200),
  author_username text check (author_username is null or char_length(author_username) <= 100),
  author_avatar_url text check (author_avatar_url is null or char_length(author_avatar_url) <= 2000),
  team_id uuid references public.teams(id) on delete cascade,
  team_name text check (team_name is null or char_length(team_name) <= 200),
  project_id uuid references public.social_projects(id) on delete set null,
  body text not null check (char_length(body) between 1 and 3000),
  visibility text not null default 'public' check (visibility in ('public','team')),
  post_type text not null default 'update' check (post_type in ('update','scan','milestone')),
  media_url text,
  media_path text,
  scan_repository text check (scan_repository is null or char_length(scan_repository) <= 300),
  scan_severity text check (scan_severity is null or scan_severity in ('low','medium','high','critical')),
  scan_score integer check (scan_score is null or scan_score between 0 and 100),
  scan_issues integer check (scan_issues is null or scan_issues >= 0),
  scan_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_posts add column if not exists media_url text;
alter table public.social_posts add column if not exists media_path text;

create table if not exists public.social_reactions (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like','celebrate','insightful')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 200),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_projects enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_reactions enable row level security;
alter table public.social_comments enable row level security;

do $$ declare p text; t text; begin
  foreach t in array array['social_projects','social_posts','social_reactions','social_comments'] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p, t);
    end loop;
  end loop;
end $$;

create policy social_projects_read on public.social_projects for select to authenticated using (true);
create policy social_projects_insert_manager on public.social_projects for insert to authenticated with check (created_by = auth.uid() and public.can_manage_team(team_id));
create policy social_projects_update_manager on public.social_projects for update to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
create policy social_projects_delete_manager on public.social_projects for delete to authenticated using (public.can_manage_team(team_id));

create policy social_posts_read on public.social_posts for select to authenticated using (visibility = 'public' or (team_id is not null and public.is_team_member(team_id)));
create policy social_posts_insert_own on public.social_posts for insert to authenticated with check (author_id = auth.uid() and ((visibility = 'public' and team_id is null) or (visibility = 'team' and team_id is not null and public.is_team_member(team_id))));
create policy social_posts_update_own on public.social_posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy social_posts_delete_own on public.social_posts for delete to authenticated using (author_id = auth.uid());

create policy social_reactions_read on public.social_reactions for select to authenticated using (exists (select 1 from public.social_posts p where p.id = post_id and (p.visibility = 'public' or public.is_team_member(p.team_id))));
create policy social_reactions_own on public.social_reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and exists (select 1 from public.social_posts p where p.id = post_id and (p.visibility = 'public' or public.is_team_member(p.team_id))));
create policy social_comments_read on public.social_comments for select to authenticated using (exists (select 1 from public.social_posts p where p.id = post_id and (p.visibility = 'public' or public.is_team_member(p.team_id))));
create policy social_comments_insert_own on public.social_comments for insert to authenticated with check (author_id = auth.uid() and exists (select 1 from public.social_posts p where p.id = post_id and (p.visibility = 'public' or public.is_team_member(p.team_id))));
create policy social_comments_update_own on public.social_comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy social_comments_delete_own on public.social_comments for delete to authenticated using (author_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.social_projects, public.social_posts, public.social_reactions, public.social_comments to authenticated;

create unique index if not exists social_projects_one_pinned_team_idx on public.social_projects(team_id) where pinned;
create index if not exists social_posts_feed_idx on public.social_posts(created_at desc);
create index if not exists social_posts_team_idx on public.social_posts(team_id, created_at desc);
create index if not exists social_posts_media_path_idx on public.social_posts(media_path) where media_path is not null;
create index if not exists social_reactions_post_idx on public.social_reactions(post_id);
create index if not exists social_comments_post_idx on public.social_comments(post_id, created_at asc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-media', 'social-media', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists social_media_insert_own on storage.objects;
drop policy if exists social_media_select_visible on storage.objects;
drop policy if exists social_media_delete_own on storage.objects;

create policy social_media_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy social_media_select_visible on storage.objects for select to authenticated
using (bucket_id = 'social-media' and (
  owner_id = auth.uid()::text or exists (
    select 1 from public.social_posts p where p.media_path = name
      and (p.visibility = 'public' or (p.team_id is not null and public.is_team_member(p.team_id)))
  )
));
create policy social_media_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'social-media' and owner_id = auth.uid()::text);

-- Deliberately does NOT delete auth users. See the separate, reviewed cleanup block below.
commit;
