import { useEffect, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'

// Cookie consent for Google Analytics (UK PECR: analytics cookies need a yes
// first). Google's script isn't loaded at all until the visitor taps Accept;
// Consent Mode is set to "denied" by default as well, belt and braces.
// The choice is kept in localStorage (that's needed to remember it, so it
// needs no consent itself). The privacy page's "Cookie settings" button
// reopens the banner via openCookieSettings().
//
// Event tracking (lib/analytics.ts) is unchanged: it pushes to dataLayer as
// before. Without consent nothing reads dataLayer, so nothing leaves the page.

export const GA_ID = 'G-NP3BRQ4P5T'
const STORAGE_KEY = 'sw_cookie_consent'
const OPEN_EVENT = 'sw:cookie-settings'

type Choice = 'granted' | 'denied'

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

function saveChoice(c: Choice) {
  try { localStorage.setItem(STORAGE_KEY, c) } catch {}
}

// The same stub gtag snippet Google gives (and lib/analytics.ts falls back to).
function gtag(...args: unknown[]) {
  const w = window as any
  w.dataLayer = w.dataLayer || []
  if (typeof w.gtag !== 'function') {
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments)
    }
  }
  w.gtag(...args)
}

const DENIED = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }

// Removes Google Analytics cookies if someone changes their mind.
function clearGaCookies() {
  try {
    const host = window.location.hostname
    const domains = ['', host, `.${host.replace(/^www\./, '')}`]
    document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => n === '_ga' || n.startsWith('_ga_')).forEach(name => {
      domains.forEach(d => { document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}` })
    })
  } catch {}
}

/** Reopens the banner (the privacy page's "Cookie settings" button). */
export function openCookieSettings() {
  try { window.dispatchEvent(new Event(OPEN_EVENT)) } catch {}
}

export default function CookieConsent() {
  const [choice, setChoice] = useState<Choice | null>(null)
  const [open, setOpen] = useState(false)
  const [loadGa, setLoadGa] = useState(false)

  useEffect(() => {
    gtag('consent', 'default', DENIED)
    const saved = readChoice()
    setChoice(saved)
    setOpen(saved === null)
    if (saved === 'granted') grant()
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function grant() {
    gtag('consent', 'update', { analytics_storage: 'granted' })
    if (!loadGa) {
      gtag('js', new Date())
      gtag('config', GA_ID)
    }
    setLoadGa(true)
  }

  const accept = () => { saveChoice('granted'); setChoice('granted'); setOpen(false); grant() }
  const reject = () => {
    saveChoice('denied'); setChoice('denied'); setOpen(false)
    if (loadGa) { gtag('consent', 'update', DENIED); clearGaCookies() }
  }

  return (
    <>
      {loadGa && <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />}
      {open && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie choice"
          style={{
            position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom))', zIndex: 1000,
            maxWidth: 520, margin: '0 auto', background: '#111827', color: '#e5e7eb',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 14px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.45,
          }}
        >
          <p style={{ margin: '0 0 10px' }}>
            Can we use Google Analytics cookies to see how the site is used? No ads, and everything works either way.{' '}
            <Link href="/privacy#cookies" style={{ color: '#2dd4bf' }}>More</Link>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Reject', 'Accept'] as const).map(label => (
              <button
                key={label}
                type="button"
                onClick={label === 'Accept' ? accept : reject}
                aria-pressed={choice === (label === 'Accept' ? 'granted' : 'denied')}
                style={{
                  flex: '1 1 0', minHeight: 40, borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', background: 'transparent', color: '#f3f4f6',
                  border: '1px solid rgba(255,255,255,0.35)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
