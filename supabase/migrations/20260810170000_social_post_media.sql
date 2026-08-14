begin;

alter table public.social_posts
  add column if not exists media_url text
  check (media_url is null or (char_length(media_url) <= 2000 and media_url ~ '^https://'));

comment on column public.social_posts.media_url is
  'Optional HTTPS image attachment. Application validation blocks credentials and non-web protocols.';

commit;
