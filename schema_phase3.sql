-- Phase 3: pages/menu, board (posts), guestbook.
-- Run each statement separately in the Neon query editor (it only accepts
-- one command per run), in this order, against the same database as
-- schema.sql / schema_phase2.sql.

create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references users(id) on delete cascade,
  name text not null,
  slug text not null,
  kind text not null default 'canvas' check (kind in ('canvas', 'board', 'guestbook')),
  order_index integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (uid, slug)
);

create index if not exists pages_uid_idx on pages (uid);

alter table elements add column if not exists page_id uuid references pages(id) on delete cascade;

create index if not exists elements_page_idx on elements (page_id);

alter table homes add column if not exists visit_count bigint not null default 0;

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references users(id) on delete cascade,
  page_id uuid references pages(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  images jsonb not null default '[]'::jsonb,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_uid_idx on posts (uid);

create index if not exists posts_page_idx on posts (page_id);

create table if not exists guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  home_owner_uid uuid not null references users(id) on delete cascade,
  author text not null,
  content text not null,
  author_uid uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists guestbook_owner_idx on guestbook_entries (home_owner_uid);

-- Backfill: every existing profile gets a default HOME canvas page, and
-- their existing freeform elements (created before pages existed) move
-- onto it. New signups get this via api/profile.js at onboarding time.
insert into pages (uid, name, slug, kind, order_index, is_default)
select u.id, 'HOME', 'home', 'canvas', 0, true
from users u
where u.username is not null
  and not exists (select 1 from pages p where p.uid = u.id);

update elements e
set page_id = p.id
from pages p
where e.page_id is null and p.uid = e.uid and p.is_default = true;
