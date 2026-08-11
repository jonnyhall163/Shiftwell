# Supabase — migrations & one-off scripts

This project doesn't have the Supabase CLI wired up, so nothing here runs
automatically. Apply things manually via the Supabase Dashboard → SQL Editor
(or `supabase db push` if you do set the CLI up later).

## migrations/20260812000000_profile_on_signup_trigger.sql

Fixes the bug where some signups never got a `shiftwell_profiles` row (see
`scripts/find-orphaned-users.sql` for how to find who was affected). Creates
a trigger on `auth.users` that creates the matching profile row server-side,
at insert time, regardless of whether email confirmation is on. Run this
once — it's safe to re-run.

**Apply it:** paste the file's contents into the SQL Editor and run.

## scripts/find-orphaned-users.sql

Read-only report: lists every `auth.users` row from the last 30 days that
has no matching `shiftwell_profiles` row, plus a ready-to-run backfill
statement (commented out) to create those missing rows immediately for
anyone already affected. Run the SELECT first, review it, then uncomment
and run the INSERT if you want to backfill in place.

## scripts/find-orphaned-users.mjs

Same report as the `.sql` version, but as a standalone Node script using
`@supabase/supabase-js` with the service role key — useful if you'd rather
script this (e.g. to export a CSV, or run it on a schedule) than use the SQL
Editor. Needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the
environment. Never commit the service role key — export it in your shell
for one-off runs:

```
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
node scripts/find-orphaned-users.mjs
```
