-- Phase 5: 기본설정 (site name, favicon, custom cursor, friend-embeddable
-- banner) + font picker. Run each statement separately in the Neon query
-- editor (Read-only toggle OFF), against the same database as the earlier
-- schema files.

alter table homes add column if not exists site_name text not null default '';

alter table homes add column if not exists favicon_url text not null default '';

alter table homes add column if not exists cursor_url text not null default '';

alter table homes add column if not exists banner_image text not null default '';

alter table homes add column if not exists banner_title text not null default '';

alter table homes add column if not exists font_family text not null default 'pretendard';
