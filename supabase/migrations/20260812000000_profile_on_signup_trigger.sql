-- SUPERSEDED by migrations/20260814000000_referral_system.sql, which
-- replaces handle_new_user() below with a version that also generates a
-- referral code. Do NOT re-run this file after that one has been applied —
-- confirmed by testing that doing so silently downgrades the trigger back
-- to this version, which doesn't set referral_code, and since that column
-- is NOT NULL, every subsequent signup then fails outright. Keeping this
-- file only as a record of what shipped first; if you're setting this
-- project up fresh, you still need to run both, in order, but never run
-- this one again afterward.
--
-- Guarantee every auth.users row gets a matching shiftwell_profiles row,
-- regardless of whether email confirmation is enabled.
--
-- Why: pages/register.tsx used to create the profile row itself, client-side,
-- immediately after supabase.auth.signUp() — via an upsert whose error was
-- never checked. When email confirmation is enabled, signUp() does not
-- return an active session, so auth.uid() is null on that request; if RLS on
-- shiftwell_profiles requires auth.uid() = id (the normal pattern), the
-- upsert is silently rejected and the user is left with an auth.users row
-- and no profile row — stuck, with no way to complete onboarding.
--
-- This trigger fires at INSERT time on auth.users itself, inside the same
-- transaction as user creation, before any confirmation step and before any
-- client-side JS runs at all. It's SECURITY DEFINER so it bypasses RLS
-- entirely, so it succeeds whether or not a session exists yet, and even if
-- the browser tab is closed the instant after signUp() is called.
--
-- Run this once in the Supabase SQL Editor (or `supabase db push` if you use
-- the CLI). Safe to re-run — it drops and recreates the trigger, and the
-- insert itself is idempotent via ON CONFLICT DO NOTHING.
--
-- Assumes shiftwell_profiles.id is the primary key and matches auth.users.id
-- (the pattern the rest of the app already relies on via .eq('id', user.id)).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.shiftwell_profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
