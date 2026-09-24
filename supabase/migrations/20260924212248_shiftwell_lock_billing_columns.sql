-- Applied to the shared Supabase project on 24 Sept 2026 (migration
-- "shiftwell_lock_billing_columns"). Recorded here so the repo matches the database.
--
-- Lock ShiftWell's billing and referral columns against edits made with a
-- user's own login.
--
-- Protected: subscription_status, trial_ends_at, stripe_customer_id,
-- subscription_id, current_period_ends_at, referral_reward_granted,
-- referred_by. comp_access already has its own trigger
-- (shiftwell_protect_comp_access), which is left unchanged.
--
-- Legitimate writers all bypass it: the Stripe webhook and checkout use the
-- service role; handle_new_user (sets referred_by at signup) is SECURITY
-- DEFINER, so it runs as postgres.
--
-- Same pattern as comp_access:
--   * only requests made as anon/authenticated are policed. The service role
--     (Stripe webhook, checkout), the SQL editor and SECURITY DEFINER
--     functions such as handle_new_user run as other roles and pass through;
--   * on UPDATE each protected column the user tried to change silently
--     keeps its old value, and every other column in the same request is
--     applied as normal;
--   * never raises, so no app request fails because of it.

create or replace function public.shiftwell_protect_billing_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A row inserted with a user's login (no app does this: rows come from
    -- handle_new_user) gets exactly what the column defaults would give it,
    -- whatever it asked for. Keep the first two in step with the column
    -- defaults if those ever change.
    new.subscription_status    := 'trialing';
    new.trial_ends_at          := timezone('utc'::text, now()) + interval '14 days';
    new.stripe_customer_id     := null;
    new.subscription_id        := null;
    new.current_period_ends_at := null;
    new.referral_reward_granted := false;
    new.referred_by            := null;
    return new;
  end if;

  if new.subscription_status is distinct from old.subscription_status then
    new.subscription_status := old.subscription_status;
  end if;
  if new.trial_ends_at is distinct from old.trial_ends_at then
    new.trial_ends_at := old.trial_ends_at;
  end if;
  if new.stripe_customer_id is distinct from old.stripe_customer_id then
    new.stripe_customer_id := old.stripe_customer_id;
  end if;
  if new.subscription_id is distinct from old.subscription_id then
    new.subscription_id := old.subscription_id;
  end if;
  if new.current_period_ends_at is distinct from old.current_period_ends_at then
    new.current_period_ends_at := old.current_period_ends_at;
  end if;
  if new.referral_reward_granted is distinct from old.referral_reward_granted then
    new.referral_reward_granted := old.referral_reward_granted;
  end if;
  if new.referred_by is distinct from old.referred_by then
    new.referred_by := old.referred_by;
  end if;

  return new;
end;
$$;

comment on function public.shiftwell_protect_billing_columns() is
  'Keeps billing and referral columns on shiftwell_profiles read-only to anon/authenticated. Changes are silently ignored, never rejected. Write them with the service role.';

create trigger shiftwell_protect_billing_columns
  before insert or update on public.shiftwell_profiles
  for each row execute function public.shiftwell_protect_billing_columns();
