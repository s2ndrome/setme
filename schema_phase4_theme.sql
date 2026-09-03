-- Custom color overrides on top of a theme preset (Phase 4, item 9).
alter table homes add column if not exists theme_colors jsonb not null default '{}'::jsonb;
