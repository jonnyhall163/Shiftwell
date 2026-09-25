// GA4 custom events.
//
// gtag itself is set up in pages/_app.tsx (the standard inline snippet plus
// the gtag.js loader, both afterInteractive). Everything here is a thin,
// fail-safe wrapper over it: analytics must never throw into — or block —
// the signup/checkout flow it's measuring, so every call is guarded and
// swallowed.
//
// If the inline gtag snippet in _app.tsx hasn't run yet, we install the
// exact same stub it defines — `function gtag(){dataLayer.push(arguments)}`
// — and call that. gtag.js only processes queued commands in its own
// Arguments format; the old fallback pushed plain arrays, which it
// silently ignores, so any event fired before the snippet ran was lost.

export type CtaLocation =
  | 'nav'
  | 'hero'
  | 'post_demo'
  | 'pricing_annual'
  | 'pricing_monthly'
  | 'footer'

function track(event: string, params?: Record<string, any>) {
  try {
    if (typeof window === 'undefined') return
    const w = window as any
    if (typeof w.gtag !== 'function') {
      w.dataLayer = w.dataLayer || []
      // Must be a real `function` (not an arrow) so `arguments` exists.
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments)
      }
    }
    w.gtag('event', event, params || {})
  } catch {
    // Never let a missing/blocked analytics script break the page.
  }
}

// Fires `event` at most once per user on this device. Per-device is the
// best available without a database column (the DB is shared with the iOS
// app), and GA4 won't de-duplicate them for us — so read these as "first
// time on this device". A user on two devices can fire each twice.
function trackOncePerUser(key: string, userId: string | null | undefined, event: string, params?: Record<string, any>) {
  try {
    if (typeof window === 'undefined' || !userId) return
    const storageKey = `sw_ga_${key}_${userId}`
    if (localStorage.getItem(storageKey)) return
    localStorage.setItem(storageKey, '1')
  } catch {
    // Storage blocked: fall through and fire anyway rather than lose it.
  }
  track(event, params)
}

/** Any "start free trial" click, tagged with where on the page it came from. */
export function trackCtaClick(location: CtaLocation) {
  track('cta_click', { location })
}

/** A Supabase auth account was successfully created. */
export function trackSignUp() {
  track('sign_up', { method: 'email' })
}

/** A Stripe Checkout session was created and we're about to redirect to it. */
export function trackBeginCheckout(plan: string) {
  track('begin_checkout', { plan })
}

/** Stripe sent the user back to /dashboard?subscribed=true — trial is live. */
export function trackTrialStarted() {
  track('trial_started')
}

// ── Activation ───────────────────────────────────────────

// 'preset' is the first screen (pick a rota preset); 'position' is "where
// are you in it today?"; 'review' is the pre-filled grid. 'type' is the
// "Mine's different" chooser that leads to the hand-built editors.
export type OnboardingStep = 'preset' | 'position' | 'review' | 'type' | 'configure' | 'rotation' | 'variable' | 'life'

/** A step of the onboarding wizard was completed (user moved past it). */
export function trackOnboardingStepCompleted(step: OnboardingStep) {
  track('onboarding_step_completed', { step })
}

/** A rota preset (or "Mine's different" = 'custom') was picked in onboarding. */
export function trackRotaPresetChosen(preset: string) {
  track('rota_preset_chosen', { preset })
}

/** Joined the iPhone launch list. */
export function trackIosWaitlistJoined(where: 'landing' | 'dashboard') {
  track('ios_waitlist_joined', { where })
}

/** Tapped the hero's "On iPhone?" link to the launch list. */
export function trackIosWaitlistLinkClicked() {
  track('ios_waitlist_link_clicked')
}

/** Onboarding saved successfully. */
export function trackOnboardingCompleted(patternType: string | null) {
  track('onboarding_completed', { pattern_type: patternType || 'unknown' })
}

/** The first AI briefing actually rendered for this user. */
export function trackFirstBriefingSeen(userId: string) {
  trackOncePerUser('first_briefing_seen', userId, 'first_briefing_seen')
}

export type LogType = 'sleep' | 'water' | 'journal'

/** First successful log of each type for this user. */
export function trackFirstLog(userId: string, type: LogType) {
  trackOncePerUser(`first_log_${type}`, userId, 'first_log', { type })
}

/** A companion message was accepted by the server. */
export function trackCompanionMessageSent() {
  track('companion_message_sent')
}
