-- One-off cleanup: find auth.users rows from the last 30 days that have no
-- matching shiftwell_profiles row (i.e. accounts stuck by the register.tsx
-- bug where profile creation could silently fail).
--
-- Run in the Supabase Dashboard → SQL Editor. Read-only — safe to run any
-- time.

select
  u.id,
  u.email,
  u.created_at,
  u.confirmed_at,                              -- null = never confirmed their email
  u.raw_user_meta_data ->> 'full_name' as full_name
from auth.users u
left join public.shiftwell_profiles p on p.id = u.id
where p.id is null
  and u.created_at >= now() - interval '30 days'
order by u.created_at desc;

-- ── Backfill ────────────────────────────────────────────────────────────
-- Once you've reviewed the list above, uncomment and run this to create the
-- missing profile rows immediately (idempotent — safe to run more than
-- once). This unblocks anyone already affected without them needing to
-- re-register. Note: after the trigger in
-- migrations/20260812000000_profile_on_signup_trigger.sql is applied, this
-- backfill should only ever need to be run this one time for pre-existing
-- affected accounts — new signups won't hit this bug again.

-- insert into public.shiftwell_profiles (id, email, full_name)
-- select
--   u.id,
--   u.email,
--   u.raw_user_meta_data ->> 'full_name'
-- from auth.users u
-- left join public.shiftwell_profiles p on p.id = u.id
-- where p.id is null
--   and u.created_at >= now() - interval '30 days'
-- on conflict (id) do nothing;
