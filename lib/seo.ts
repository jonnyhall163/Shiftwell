// Site-wide SEO / social-share constants.
//
// Open Graph and Twitter Card images MUST be absolute URLs — Facebook,
// WhatsApp, Threads and X all silently drop relative paths, which is the
// difference between a rich preview card and a bare link.
//
// NEXT_PUBLIC_SITE_URL is the same var the Stripe redirect URLs use. The
// hardcoded fallback matters more here than it does there: if the env var
// is missing at build time, an unguarded template would emit
// "undefined/og-image.png" and break every share preview, whereas Stripe
// would fail loudly. Falling back to the production domain means the tags
// are always valid.

const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://getshiftwell.com'

/** Absolute site origin, guaranteed to have no trailing slash. */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, '')

export const SITE_NAME = 'ShiftWell'

export const DEFAULT_TITLE = 'ShiftWell: Built for Shift Workers'

export const DEFAULT_DESCRIPTION =
  'Sleep guidance, food timing and AI coaching that fits your actual shift pattern, not a 9-to-5. Free 14-day trial.'

export const OG_IMAGE = `${SITE_URL}/og-image.png`
export const OG_IMAGE_WIDTH = '1200'
export const OG_IMAGE_HEIGHT = '630'
export const OG_IMAGE_ALT =
  "ShiftWell. Your life doesn't run on a 9-to-5. Your app shouldn't either."

/** Builds an absolute URL for a path, for og:url / canonical tags. */
export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
