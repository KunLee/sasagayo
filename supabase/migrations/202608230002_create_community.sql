create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 280),
  location text not null default '' check (char_length(location) <= 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    'listener_' || substr(replace(new.id::text, '-', ''), 1, 10),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Listener'), '@', 1))
  );
  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id, handle, display_name)
select id,
  'listener_' || substr(replace(id::text, '-', ''), 1, 10),
  split_part(coalesce(email, 'Listener'), '@', 1)
from auth.users
on conflict (id) do nothing;

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 3 and 120),
  excerpt text not null check (char_length(excerpt) between 10 and 320),
  body text not null check (char_length(body) between 20 and 12000),
  category text not null default 'reflection' check (category in ('memory','discovery','reflection','ritual')),
  mood text not null default 'reflective' check (char_length(mood) <= 40),
  track_title text not null check (char_length(track_title) between 1 and 120),
  artist_name text not null check (char_length(artist_name) between 1 and 120),
  external_url text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'published' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 3 and 60),
  description text not null check (char_length(description) between 10 and 280),
  accent text not null default '#a74735',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','owner')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table public.story_reactions (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table public.story_bookmarks (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.circles (slug, name, description, accent) values
  ('sunday-morning-club', 'Sunday Morning Club', 'Warm, gentle records for slow starts and unhurried conversation.', '#d6aa69'),
  ('songs-for-starting-over', 'Songs for Starting Over', 'Tender resets, brave beginnings, and music for becoming again.', '#769295'),
  ('after-midnight', 'After Midnight', 'For the quiet hours that ask better questions and reward close listening.', '#8b6877'),
  ('deep-listening-room', 'Deep Listening Room', 'Albums in full, phones face down, and thoughtful notes after the final track.', '#617a68')
on conflict (slug) do nothing;

alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.story_reactions enable row level security;
alter table public.story_bookmarks enable row level security;
alter table public.comments enable row level security;

revoke all on table public.profiles, public.stories, public.circles, public.circle_members, public.story_reactions, public.story_bookmarks, public.comments from anon, authenticated;
grant select on table public.profiles, public.stories, public.circles, public.circle_members, public.story_reactions, public.comments to anon, authenticated;
grant insert, update, delete on table public.profiles, public.stories, public.circles, public.circle_members, public.story_reactions, public.story_bookmarks, public.comments to authenticated;
grant select on table public.story_bookmarks to authenticated;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Published stories are public" on public.stories for select using (status = 'published' or author_id = (select auth.uid()));
create policy "Users publish own stories" on public.stories for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Authors update stories" on public.stories for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Authors delete stories" on public.stories for delete to authenticated using (author_id = (select auth.uid()));

create policy "Public circles are visible" on public.circles for select using (is_public or owner_id = (select auth.uid()));
create policy "Users create circles" on public.circles for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners manage circles" on public.circles for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete circles" on public.circles for delete to authenticated using (owner_id = (select auth.uid()));

create policy "Circle memberships are visible" on public.circle_members for select using (true);
create policy "Users join as themselves" on public.circle_members for insert to authenticated with check (user_id = (select auth.uid()) and role = 'member');
create policy "Users leave circles" on public.circle_members for delete to authenticated using (user_id = (select auth.uid()));

create policy "Reactions are visible" on public.story_reactions for select using (true);
create policy "Users add own reaction" on public.story_reactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove own reaction" on public.story_reactions for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users see own bookmarks" on public.story_bookmarks for select to authenticated using (user_id = (select auth.uid()));
create policy "Users add own bookmark" on public.story_bookmarks for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users remove own bookmark" on public.story_bookmarks for delete to authenticated using (user_id = (select auth.uid()));

create policy "Comments are visible" on public.comments for select using (true);
create policy "Users write own comments" on public.comments for insert to authenticated with check (author_id = (select auth.uid()));
create policy "Authors update comments" on public.comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "Authors delete comments" on public.comments for delete to authenticated using (author_id = (select auth.uid()));

create index stories_published_idx on public.stories (published_at desc) where status = 'published';
create index stories_author_idx on public.stories (author_id, created_at desc);
create index comments_story_idx on public.comments (story_id, created_at);
create index circle_members_user_idx on public.circle_members (user_id, joined_at desc);
