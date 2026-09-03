-- Adds the 'widget' element type (D-day, divider, preference table,
-- friend links, gallery, collapsible text, guestbook shortcut, music).
-- Run each statement separately.
alter table elements drop constraint if exists elements_type_check;

alter table elements add constraint elements_type_check
  check (type in ('text', 'image', 'box', 'button', 'widget'));
