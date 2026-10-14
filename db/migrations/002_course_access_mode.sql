-- Per-course access mode.

-- 'open' (default) => course and classroom are readable by anyone with the
--                     link, so a school can explore every generated class
--                     without an account or an access code.
-- 'code'           => classroom stays behind an institution access code or an
--                     organization account (opt-in per course).
--
-- Existing rows default to 'open': LC Academy course access codes were always
-- meant to be an optional gate, and the school-facing catalog must not look
-- empty because nothing was assigned yet.

alter table courses
  add column if not exists access_mode text not null default 'open';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_access_mode_check'
  ) then
    alter table courses
      add constraint courses_access_mode_check
      check (access_mode in ('open', 'code'));
  end if;
end
$$;
