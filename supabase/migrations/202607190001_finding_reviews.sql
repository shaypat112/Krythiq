create table if not exists public.finding_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  repository text not null,
  finding_key text not null,
  status text not null check (status in ('reviewed', 'false_positive', 'ignored', 'open')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, repository, finding_key)
);

alter table public.finding_reviews enable row level security;

create policy "Users can read their finding reviews"
  on public.finding_reviews for select using (auth.uid() = user_id);
create policy "Users can create their finding reviews"
  on public.finding_reviews for insert with check (auth.uid() = user_id);
create policy "Users can update their finding reviews"
  on public.finding_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists finding_reviews_user_repository_idx
  on public.finding_reviews (user_id, repository);
