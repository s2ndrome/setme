-- Lets the header image be repositioned (like a cover-photo drag), not
-- just cropped to a fixed center.
alter table homes add column if not exists header_position jsonb not null default '{"x":50,"y":50}'::jsonb;
