-- Referral system: schema + updated signup trigger.
--
-- Run this once in the Supabase SQL Editor, AFTER
-- migrations/20260812000000_profile_on_signup_trigger.sql (this migration
-- replaces that one's handle_new_user() function with a version that also
-- generates a referral code and records who referred the new user).
-- Safe to re-run.

-- ── Code generator ──────────────────────────────────────────────────────
-- 7-char alphanumeric, excluding visually ambiguous characters (0/O, 1/I/L).
-- Retries on collision (astronomically unlikely at this length, but cheap
-- to guard properly rather than assume).
create or replace function public.generate_referral_code(len int default 7)
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
begin
  loop
    result := '';
    for i in 1..len loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.shiftwell_profiles where referral_code = result);
  end loop;
  return result;
end;
$$;

-- ── Columns ─────────────────────────────────────────────────────────────
alter table public.shiftwell_profiles
  add column if not exists referral_code text,
  add column if not exists referred_by text,
  add column if not exists referral_reward_granted boolean not null default false;

-- Backfill existing rows before enforcing NOT NULL / UNIQUE.
update public.shiftwell_profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

alter table public.shiftwell_profiles
  alter column referral_code set not null;

create unique index if not exists shiftwell_profiles_referral_code_key
  on public.shiftwell_profiles (referral_code);

create index if not exists shiftwell_profiles_referred_by_idx
  on public.shiftwell_profiles (referred_by);

-- ── Audit trail for reward grants ──────────────────────────────────────
-- Durable record of what the webhook did for each conversion — including
-- the annual-plan case, which is deliberately NOT auto-credited (a free
-- month doesn't map to a clean amount on an annual price) and needs a
-- human to action it. Read-only via RLS; only the service role (used by
-- the webhook) can write to it.
create table if not exists public.referral_events (
  id uuid primary key default gen_random_uuid(),
  -- set null (not cascade) on both — this is a financial audit trail of
  -- real Stripe balance transactions; either user deleting their account
  -- later should never silently erase the record that a credit was granted.
  referred_user_id uuid references auth.users(id) on delete set null,
  referrer_user_id uuid references auth.users(id) on delete set null,
  referral_code text not null,
  status text not null,        -- 'granted' | 'needs_manual_handling' | 'skipped_no_stripe_customer' | 'skipped_referrer_not_found'
  amount_pence integer,        -- credit actually applied, null if not applicable
  note text,
  created_at timestamptz not null default now()
);

create index if not exists referral_events_referrer_idx on public.referral_events (referrer_user_id);

alter table public.referral_events enable row level security;
-- No policies added — default-deny for anon/authenticated. The webhook
-- uses the service role key, which bypasses RLS, so it can still write.

-- ── Signup trigger ──────────────────────────────────────────────────────
-- Replaces the handle_new_user() from the earlier profile-creation
-- migration: same job (create the profile row server-side, atomically with
-- auth.users insert, regardless of email confirmation), plus:
--   - generates this user's own referral_code
--   - validates and records referred_by from signup metadata: must match
--     an existing profile's referral_code, or it's silently dropped (never
--     blocks signup either way)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  incoming_ref text;
  new_code text;
begin
  new_code := public.generate_referral_code();

  incoming_ref := nullif(trim(new.raw_user_meta_data ->> 'referred_by'), '');

  if incoming_ref is not null then
    -- Must belong to an existing user, and can't be this user's own code
    -- (can't happen in practice since new_code is freshly generated, but
    -- cheap to guard explicitly).
    if incoming_ref = new_code
       or not exists (select 1 from public.shiftwell_profiles where referral_code = incoming_ref) then
      incoming_ref := null;
    end if;
  end if;

  insert into public.shiftwell_profiles (id, email, full_name, referral_code, referred_by)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', new_code, incoming_ref)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
