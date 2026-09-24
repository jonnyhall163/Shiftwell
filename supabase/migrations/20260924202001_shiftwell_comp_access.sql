-- Applied to the shared Supabase project on 24 Sept 2026 (migration
-- "shiftwell_comp_access"). Recorded here so the repo matches the database.
--
-- comp_access: hand-granted free access (ambassadors, founders). Only the
-- service role can set it; a user's own change is silently ignored.

alter table public.shiftwell_profiles
  add column if not exists comp_access boolean not null default false;

comment on column public.shiftwell_profiles.comp_access is
  'Hand-granted free access (ambassadors, founders). When true the user has full access whatever subscription_status/trial_ends_at say, and the Stripe webhook leaves their billing fields alone. Set only with the service role.';

create or replace function public.shiftwell_protect_comp_access()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.comp_access := false;
    elsif new.comp_access is distinct from old.comp_access then
      new.comp_access := old.comp_access;
    end if;
  end if;
  return new;
end;
$$;

create trigger shiftwell_protect_comp_access
  before insert or update on public.shiftwell_profiles
  for each row execute function public.shiftwell_protect_comp_access();
