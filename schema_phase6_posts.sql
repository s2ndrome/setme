-- Phase 6: rich post editor (cover image + sanitized HTML body already
-- fit the existing content/images columns — only the cover image is new).
alter table posts add column if not exists cover_image text not null default '';
