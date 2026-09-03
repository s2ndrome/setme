-- Adds a per-home Custom CSS field (Phase 4, item 10 of the plan).
alter table homes add column if not exists custom_css text not null default '';
