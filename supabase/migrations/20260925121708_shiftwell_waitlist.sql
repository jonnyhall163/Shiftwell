-- Applied to the shared Supabase project on 25 Sept 2026 (migration
-- "shiftwell_waitlist"). Recorded here so the repo matches the database.
--
-- ShiftWell launch lists (the iPhone launch list first). Server-only: RLS on
-- with no policies, so the browser and the iOS app (anon/authenticated)
-- can't read or write it; /api/waitlist inserts with the service key.

create table public.shiftwell_waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text not null default 'ios_waitlist',   -- which list
  entry_point text not null,                           -- 'landing' | 'dashboard'
  user_id     uuid references auth.users(id) on delete set null,  -- set for dashboard sign-ups
  created_at  timestamptz not null default now(),
  constraint shiftwell_waitlist_email_format
    check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint shiftwell_waitlist_source_len check (char_length(source) between 1 and 40),
  constraint shiftwell_waitlist_entry_point check (entry_point in ('landing', 'dashboard'))
);

-- One row per email per list, case-insensitive: duplicates are ignored.
create unique index shiftwell_waitlist_email_source_key
  on public.shiftwell_waitlist (lower(email), source);

alter table public.shiftwell_waitlist enable row level security;
revoke all on public.shiftwell_waitlist from anon, authenticated;

comment on table public.shiftwell_waitlist is
  'ShiftWell launch lists (e.g. source=ios_waitlist). Written only by the web server with the service key.';
