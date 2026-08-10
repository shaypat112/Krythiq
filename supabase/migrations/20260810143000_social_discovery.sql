begin;

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
create unique index if not exists social_projects_one_pinned_team_idx on public.social_projects(team_id) where pinned;

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
  scan_repository text check (scan_repository is null or char_length(scan_repository) <= 300),
  scan_severity text check (scan_severity is null or scan_severity in ('low','medium','high','critical')),
  scan_score integer check (scan_score is null or scan_score between 0 and 100),
  scan_issues integer check (scan_issues is null or scan_issues >= 0),
  scan_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
alter table public.social_projects force row level security;
alter table public.social_posts enable row level security;
alter table public.social_posts force row level security;
alter table public.social_reactions enable row level security;
alter table public.social_reactions force row level security;
alter table public.social_comments enable row level security;
alter table public.social_comments force row level security;

create policy social_projects_read on public.social_projects for select to authenticated using (true);
create policy social_projects_insert_manager on public.social_projects for insert to authenticated with check (created_by = (select auth.uid()) and public.can_manage_team(team_id));
create policy social_projects_update_manager on public.social_projects for update to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id));
create policy social_projects_delete_manager on public.social_projects for delete to authenticated using (public.can_manage_team(team_id));

create policy social_posts_read on public.social_posts for select to authenticated using (visibility = 'public' or (team_id is not null and public.is_team_member(team_id)));
create policy social_posts_insert_own on public.social_posts for insert to authenticated with check (author_id = (select auth.uid()) and (team_id is null or public.is_team_member(team_id)));
create policy social_posts_update_own on public.social_posts for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy social_posts_delete_own on public.social_posts for delete to authenticated using (author_id = (select auth.uid()));

create policy social_reactions_read on public.social_reactions for select to authenticated using (exists (select 1 from public.social_posts post where post.id = post_id and (post.visibility = 'public' or (post.team_id is not null and public.is_team_member(post.team_id)))));
create policy social_reactions_own on public.social_reactions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and exists (select 1 from public.social_posts post where post.id = post_id and (post.visibility = 'public' or (post.team_id is not null and public.is_team_member(post.team_id)))));
create policy social_comments_read on public.social_comments for select to authenticated using (exists (select 1 from public.social_posts post where post.id = post_id and (post.visibility = 'public' or (post.team_id is not null and public.is_team_member(post.team_id)))));
create policy social_comments_insert_own on public.social_comments for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.social_posts post where post.id = post_id and (post.visibility = 'public' or (post.team_id is not null and public.is_team_member(post.team_id)))));
create policy social_comments_update_own on public.social_comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy social_comments_delete_own on public.social_comments for delete to authenticated using (author_id = (select auth.uid()));

grant select, insert, update, delete on public.social_projects, public.social_posts, public.social_reactions, public.social_comments to authenticated;
create index if not exists social_posts_feed_idx on public.social_posts(created_at desc);
create index if not exists social_posts_team_idx on public.social_posts(team_id, created_at desc);
create index if not exists social_reactions_post_idx on public.social_reactions(post_id);
create index if not exists social_comments_post_idx on public.social_comments(post_id, created_at asc);

commit;
