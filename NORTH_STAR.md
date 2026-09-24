# ShiftWell North Star: the improvement plan

Adopted 24 Sept 2026. This plan decides what gets built and in what order. Every task should move at least one item below forward. If a task doesn't, question it before building it.

## The one goal

Get a new user from signup to "I'd miss this" in their first week. ShiftWell has no shortage of features. The problem is the first 14 days: people sign up, don't see enough value in the first session, and never come back.

## Where ShiftWell stands (24 Sept 2026)

| Stage | People | Of signups |
| --- | --- | --- |
| Signed up (excluding Jonny and Ashleigh) | 32 | 100% |
| Used any core feature (briefing, sleep, hydration, journal) | 7 | 22% |
| Started a Stripe trial | 16 | 50% |
| Ever paid | 2 | 6% |
| Paying today | 1 (annual £59.99) | 3% |
| Active in the last 7 days | 1 | 3% |

- Total revenue since March: £67.98. One more trial ends 1 Oct.
- Signups: 14 in April, 8 in May, about 2 a month since June. About 1 in 20 site visitors signs up.
- 10 of 34 accounts never finished onboarding.
- Community: 1 post (the founder post) and 1 heart in total.
- Supabase status data is wrong. It shows 2 "active" and 29 "trialing" with long-expired trials, while Stripe shows 1 paying.
- Stripe cancel reasons (14 cancelled): unused 5, missing features 2, switched service 2, too expensive 1, "doesn't work for me" 1, none given 3.

## Why people leave

1. There are 6 to 7 screens and a card form before any value (register, onboarding, plan, Stripe checkout, dashboard).
2. The 28-day rota grid starts every day as "Early", so a standard rota takes about 40 taps.
3. The first dashboard screen has no welcome and no first action, just a loading card and 8 stacked cards.
4. The web briefing never gets smarter, because it ignores logged sleep, water and journal data.
5. Nothing brings people back: no emails, no push, no trial-ending reminder. Resend isn't even installed.
6. US and Canada users get the wrong time and shift, because the web companion and briefing use the server's UTC clock.

## Priority 1: Fix this week (live web app, `jonnyhall163/Shiftwell`)

- [x] Turn on Stripe's trial reminder emails (Stripe dashboard setting, no code). *(24 Sept 2026: Jonny checked, already on)*
- [ ] Fix the Stripe webhook: *(code written and tested with mocks on branch `claude/shiftwell-app-audit-4m6qm8`, 11309dc. Not on main until tested in a Stripe sandbox. The 29 stale rows were corrected against Stripe on 24 Sept 2026, a direct database fix with no commit.)*
  - The £0 invoice at trial start marks users "active" and pays the referral reward early. Stop it.
  - Save Stripe's real trial end date.
  - Re-check the subscription with Stripe on every event.
  - Correct the 29 stale "trialing" rows.
- [x] Fix the US/Canada time bugs: *(24 Sept 2026, f9f69da)*
  - Send the user's local date and hour to `/api/briefing` and `/api/companion`, and never work them out on the server.
  - Fix the `toISOString()` date in `lib/shiftEngine.ts` for variable schedules.
- [x] Make the companion safe at 3am: *(24 Sept 2026, f9f69da)*
  - Add crisis guidance (Samaritans 116 123 in the UK, 988 in the US and Canada).
  - Cap message length and history, and rate-limit it.
- [x] Remove "they chose this life" from both AI prompts. *(24 Sept 2026, f9f69da)*
- [x] Replace the invented social proof (the made-up avatar letters) with a real testimonial, or remove it. *(24 Sept 2026, f9f69da: removed; empty testimonial slot ready)*
- [x] Track activation events: onboarding step completed, onboarding finished, first briefing seen, first sleep/water/journal log, companion used. Fix the broken GA `dataLayer` fallback. *(24 Sept 2026, f9f69da)*
- [x] Run a secret scan on the full history of the public web repo, or make the repo private. *(24 Sept 2026, all 72 commits scanned, nothing found, no code change)*
- [ ] Ambassador/comp access: a `comp_access` flag on `shiftwell_profiles` (only the service role can set it) gives full access whatever Stripe says, and the Stripe webhook skips those users. Set for Jonny and Ashleigh. *(Code 8b77a56 and column added 24 Sept 2026. Tick once Ashleigh's Stripe cancellation is confirmed safe.)*
- [ ] Supabase critical advisory: RLS is disabled on `spatial_ref_sys`, a PostGIS system table in the shared Elsie project. Don't enable it blind. Check which apps use PostGIS first. The proper fix comes with the Supabase move. *(Checked 24 Sept 2026: the web app uses no PostGIS. In the database, only `get_snipswap_nearby_listings` (another app) uses it.)*

## Priority 2: Build into the native launch (`jonnyhall163/shiftwell-native`)

1. **Onboarding in under a minute:**
   - Presets: Early/Late/Night/Off rotation, 4 on 4 off, nights only, days only, "mine's different".
   - "Snap a photo of your rota": Claude reads the photo and fills in the pattern.
   - No 28-day tap grid.
2. **Value before the paywall.** Show the first personalised briefing straight after onboarding, then the App Store paywall.
3. **Push notifications are a hard launch requirement:**
   - The daily briefing about 90 minutes before a shift.
   - A wind-down push after a night.
   - Trial nudges on days 1, 3 and 12.
   - A reminder 2 days before the trial ends.
4. **Make logging pay off.** A weekly recap card, e.g. "3 nights, 4h 40m average sleep, best sleep came after your last coffee before 3am".
5. **Trial and pricing.** Use Apple's standard free trial, with the annual plan as the default. Don't cut the price: this is a value problem, not a price problem.
   - [ ] Honour `shiftwell_profiles.comp_access`: when it's true, give full access with no paywall, whatever the subscription status or App Store entitlement says (ambassadors such as Ashleigh, and Jonny). Only the service role can set it.
6. **Hide Community at launch.** Bring it back once there are a couple of hundred active users.
7. **Food logging.** Caffeine logging only at launch. Full meal/snack logging comes later.
8. **Move ShiftWell off Elsie's Supabase before launch.** The shared project's signup trigger may create ShiftWell profiles for other apps' signups.

Later, once people stay: lock-screen widget, calendar import, Apple Watch, then the Flip Plan (see below).

## Positioning

- Pitch: "the one app that knows your rota", for sleep, food and the 3am moments together, built by someone on the same rota.
- Sell practical help for real lives (kids, school runs), not body-clock science. Timeshifter and Arcashift have research papers; ShiftWell doesn't need to fight on that.
- UK/NHS angle: nurses get Sleepio free, and it doesn't know rotas. "Sleepio doesn't know you're on nights. ShiftWell does."
- Flip Plan comes after launch. Make it practical and woven into the briefing. Timeshifter and Arcashift already sell changeover plans, so don't market it as new.

| Competitor | Price | Weak spot |
| --- | --- | --- |
| Timeshifter Shift Work | $6.99/mo, $69.99/yr, 30-day trial with no card | 2.4★ on Android, manual shift entry |
| Arcashift (Clairoe) | ~$6.99–12.99/mo | Extra shift types cost more |
| OffShift | $3.99/mo | New, few reviews (has widgets, Watch, calendar import) |
| NightFast | $9.99/mo | Food only |
| Rise Science | $69.99/yr | Doesn't work for night workers |
| Sleepio | Free for NHS staff | Doesn't know rotas |

## Changes to the earlier plan (23 Sept blueprint)

| Plan item | Change |
| --- | --- |
| Web app | "Fix this week" list comes before new native work |
| Native redesign | Add quick-start onboarding and "briefing before paywall" |
| Food logging | Caffeine only at launch (was meal/snack/caffeine) |
| Community | Hidden on native at launch (was "unchanged") |
| Push notifications | Hard launch requirement |
| Weekly recap | Added to launch |
| Landing page | Real app screenshot above the fold, one real testimonial |

## How to use this file

- Before starting any task, say which item in this plan it moves forward.
- If a request conflicts with this plan, flag it before building.
- When an item is done, tick it here with the date and commit hash.
