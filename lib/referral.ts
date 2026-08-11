import { supabase } from './supabaseClient'

const REF_STORAGE_KEY = 'shiftwell_ref_code'

/**
 * Reads a ?ref=CODE query param, if present, and stores it in localStorage
 * for use at signup (the visitor may browse for a while before registering).
 * Existence validation — does this code belong to anyone at all — is handled
 * authoritatively server-side by the signup trigger, which silently drops
 * any code that doesn't match a real profile, so it's intentionally not
 * duplicated here.
 *
 * Self-referral guard: if the visitor is currently logged in and the code
 * matches their own referral_code, it's ignored rather than stored.
 *
 * Best-effort only — every step is wrapped so a failure here can never break
 * the page that calls it.
 */
export async function captureReferralCodeFromUrl(): Promise<void> {
  try {
    if (typeof window === 'undefined') return
    const ref = new URLSearchParams(window.location.search).get('ref')?.trim()
    if (!ref) return

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase
        .from('shiftwell_profiles')
        .select('referral_code')
        .eq('id', session.user.id)
        .maybeSingle()
      if (profile?.referral_code && profile.referral_code === ref) return
    }

    localStorage.setItem(REF_STORAGE_KEY, ref)
  } catch {
    // Never let referral capture break the page it's called from.
  }
}

export function getStoredReferralCode(): string | null {
  try {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REF_STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearStoredReferralCode(): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.removeItem(REF_STORAGE_KEY)
  } catch {
    // ignore
  }
}
