-- Phase 2: 꾸미기 모드 (freeform canvas elements).
-- Run this once against the same Vercel Postgres database as schema.sql,
-- e.g. via the database's query editor in the Vercel dashboard.

create table if not exists elements (
  id uuid primary key default gen_random_uuid(),
  uid uuid not null references users(id) on delete cascade,
  type text not null check (type in ('text', 'image', 'box', 'button')),
  x double precision not null default 40,
  y double precision not null default 40,
  width double precision not null default 200,
  height double precision not null default 80,
  rotation double precision not null default 0,
  z_index integer not null default 0,
  visible boolean not null default true,
  opacity double precision not null default 1,
  content jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists elements_uid_idx on elements (uid);
