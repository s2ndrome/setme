-- Adds a header/banner image to replace the fixed profile card.
alter table homes add column if not exists header_image text not null default '';
