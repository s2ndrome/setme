-- Lets each board page (category) choose how its post list displays:
-- 'list' (plain text rows) or 'gallery' (image grid using each post's
-- cover image), matching Tistory-style category display variants.
alter table pages add column if not exists list_style text not null default 'list';
