# Supabase — migrations & one-off scripts

This project doesn't have the Supabase CLI wired up, so nothing here runs
automatically. Apply things manually via the Supabase Dashboard → SQL Editor
(or `supabase db push` if you do set the CLI up later).

## migrations/20260812000000_profile_on_signup_trigger.sql

Fixes the bug where some signups never got a `shiftwell_profiles` row (see
`scripts/find-orphaned-users.sql` for how to find who was affected). Creates
a trigger on `auth.users` that creates the matching profile row server-side,
at insert time, regardless of whether email confirmation is on.

**Apply it:** paste the file's contents into the SQL Editor and run — once.
**Superseded by the referral migration below** — do not run this file again
after that one's been applied. Confirmed by testing: re-running it silently
downgrades the trigger back to a version that doesn't set `referral_code`,
and since that column is `NOT NULL`, every signup after that would fail
outright until the referral migration is re-applied.

## migrations/20260814000000_referral_system.sql

Adds the referral system: `referral_code` / `referred_by` /
`referral_reward_granted` on `shiftwell_profiles`, a `referral_events` audit
table, and replaces `handle_new_user()` from the migration above with a
version that also generates each new user's referral code and records who
referred them (validated — an unrecognized code is silently dropped, never
blocks signup). Run this once, after the migration above. Safe to re-run on
its own (re-running just the trigger-downgrade one above is the only
sequencing hazard — see the note there).

**Apply it:** paste the file's contents into the SQL Editor and run.

Tested end-to-end against a real (throwaway, local) Postgres instance before
shipping: fresh signup gets a code; a valid `referred_by` is captured; an
unrecognized one is silently dropped; self-referral is rejected; existing
pre-migration rows get backfilled with a code; two concurrent reward-grant
attempts for the same conversion — the double-webhook-delivery case — only
let one through; and the `referral_events` audit row survives even if the
referred user later deletes their account.

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
