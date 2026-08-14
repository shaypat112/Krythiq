create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('scanning', 'bug', 'feature', 'other')),
  message text not null check (char_length(message) between 10 and 2000),
  details text check (details is null or char_length(details) <= 4000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.site_feedback enable row level security;

create policy "Users can submit feedback"
  on public.site_feedback for insert
  with check (auth.uid() = user_id);

create index if not exists site_feedback_status_created_idx
  on public.site_feedback (status, created_at desc);
