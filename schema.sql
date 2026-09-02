-- Run this once against the Vercel Postgres database, e.g. via the
-- database's query editor in the Vercel dashboard, or:
--   psql "$POSTGRES_URL" -f schema.sql

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  username text unique,
  nickname text,
  bio text not null default '',
  profile_image text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists homes (
  uid uuid primary key references users(id) on delete cascade,
  visibility text not null default 'public',
  edit_mode text not null default 'builder',
  theme text not null default 'basic',
  background jsonb not null default '{"type":"color","value":"#f5f5f5"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
