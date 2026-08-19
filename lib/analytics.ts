// GA4 custom events.
//
// gtag itself is set up in pages/_app.tsx (the standard inline snippet plus
// the gtag.js loader, both afterInteractive). Everything here is a thin,
// fail-safe wrapper over it: analytics must never throw into — or block —
// the signup/checkout flow it's measuring, so every call is guarded and
// swallowed.
//
// If gtag.js hasn't finished loading yet, events are pushed onto dataLayer
// instead and processed once it does, so a fast click right after hydration
// still gets counted.

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
    if (typeof w.gtag === 'function') {
      w.gtag('event', event, params || {})
    } else {
      w.dataLayer = w.dataLayer || []
      w.dataLayer.push(['event', event, params || {}])
    }
  } catch {
    // Never let a missing/blocked analytics script break the page.
  }
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
