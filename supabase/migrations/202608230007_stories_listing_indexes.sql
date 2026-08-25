-- Add supporting indexes for the community Stories listing query used by
-- GET /api/community?resource=stories, which filters on status and orders
-- by published_at, and joins profiles via stories.author_id. Without these
-- indexes this query falls back to a sequential scan that grows slower as
-- the stories table grows, causing the multi-second freeze observed when
-- opening the Stories view from the main menu.

create index if not exists stories_status_published_at_idx
  on public.stories (status, published_at desc nulls last);

create index if not exists stories_author_id_idx
  on public.stories (author_id);
