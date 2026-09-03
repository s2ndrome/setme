-- Pages whose "배경" was never explicitly customized were stuck on a
-- hardcoded #f5f5f5 that visually disagreed with whatever "배경색" was
-- picked in the 테마 tab. Repoint any home still on that untouched
-- default to the theme's own background color (a CSS var, resolved live)
-- so the two stay in sync unless someone deliberately picks a different
-- background for the canvas page. Run each statement separately.
update homes set background = '{"type":"color","value":"var(--color-bg)"}'::jsonb
where background = '{"type":"color","value":"#f5f5f5"}'::jsonb;

alter table homes alter column background set default '{"type":"color","value":"var(--color-bg)"}'::jsonb;
