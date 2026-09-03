-- Lets the header image section be turned off entirely, not just left
-- empty (which still reserved space for the placeholder).
alter table homes add column if not exists header_enabled boolean not null default true;
