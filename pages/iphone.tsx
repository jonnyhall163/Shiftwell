import { useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import Image, { type StaticImageData } from 'next/image'
import { Plus_Jakarta_Sans } from 'next/font/google'
import Link from 'next/link'
import IosWaitlistForm from '../components/IosWaitlistForm'
import { isAndroidUserAgent } from '../lib/device'
import { trackCtaClick } from '../lib/analytics'
import { SITE_NAME, absoluteUrl } from '../lib/seo'
import todayImg from '../public/iphone/today.png'
import sleepImg from '../public/iphone/sleep.png'
import foodImg from '../public/iphone/food.png'

// iPhone launch-list page. One job: get an email onto the list. So no trial
// buttons and no nav, and the form sits both high up and at the bottom.
// Signups go through /api/waitlist like the landing page's form.

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const PAGE_TITLE = 'ShiftWell for iPhone'
const PAGE_DESCRIPTION = 'The app that knows your rota. Join the launch list and get 2 months free.'
const OFFER = 'Join the list now and get 2 months free when it launches. First 100 only.'
// Share card (Facebook, X, WhatsApp). The page itself shows today.png.
const SHARE_IMAGE = absoluteUrl('/iphone/share.png')
const SHARE_ALT = 'ShiftWell for iPhone is almost here. The app that knows your rota, shown on the Today screen. Join the list, 2 months free.'

type Slide = { name: string; img: StaticImageData; alt: string }

const SLIDES: Slide[] = [
  { name: 'Today', img: todayImg, alt: "ShiftWell Today screen showing your week and today's briefing" },
  { name: 'Sleep', img: sleepImg, alt: 'ShiftWell Sleep screen showing your last sleep and the last 7 nights next to your shifts' },
  { name: 'Food', img: foodImg, alt: 'ShiftWell Food screen showing your caffeine cut-off and meals planned around a late shift' },
]

const POINTS = [
  { icon: '📸', text: 'Snap a photo of your rota and it sets itself up.' },
  { icon: '☕', text: 'Knows when your last coffee should be.' },
  { icon: '🌙', text: 'Shows how you really slept after nights.' },
]

export default function IphonePage() {
  const [joined, setJoined] = useState(false)
  const starsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = starsRef.current
    if (!container) return
    for (let i = 0; i < 70; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 2 + 0.5
      star.style.cssText = `
        position: absolute; background: white; border-radius: 50%;
        left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
        width: ${size}px; height: ${size}px;
        animation: twinkle ${2 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 4}s;
        --min-op: ${0.05 + Math.random() * 0.1}; --max-op: ${0.3 + Math.random() * 0.5};
      `
      container.appendChild(star)
    }
    return () => { container.innerHTML = '' }
  }, [])

  const font = jakarta.style.fontFamily

  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link rel="canonical" href={absoluteUrl('/iphone')} />

        {/* Same keys as the defaults in _app.tsx, so these replace them. */}
        <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
        <meta property="og:url" content={absoluteUrl('/iphone')} key="og:url" />
        <meta property="og:title" content={PAGE_TITLE} key="og:title" />
        <meta property="og:description" content={PAGE_DESCRIPTION} key="og:description" />
        <meta property="og:image" content={SHARE_IMAGE} key="og:image" />
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="630" key="og:image:height" />
        <meta property="og:image:alt" content={SHARE_ALT} key="og:image:alt" />
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:title" content={PAGE_TITLE} key="twitter:title" />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} key="twitter:description" />
        <meta name="twitter:image" content={SHARE_IMAGE} key="twitter:image" />
        <meta name="twitter:image:alt" content={SHARE_ALT} key="twitter:image:alt" />
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: var(--min-op, 0.1); }
            50% { opacity: var(--max-op, 0.6); }
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 6px #2dd4bf; }
            50% { box-shadow: 0 0 16px #2dd4bf, 0 0 30px rgba(45,212,191,0.4); }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #090c14; overflow-x: hidden; }
          .logo-dot { animation: pulse 2s ease-in-out infinite; }
          .shots { scrollbar-width: none; -webkit-overflow-scrolling: touch; }
          .shots::-webkit-scrollbar { display: none; }
        `}</style>
      </Head>

      <div style={{ position: 'fixed', inset: 0, background: '#090c14', zIndex: 0 }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(45,212,191,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 90%, rgba(245,158,11,0.06) 0%, transparent 55%),
          radial-gradient(ellipse 40% 30% at 10% 60%, rgba(99,102,241,0.05) 0%, transparent 50%)
        `,
      }} />
      <div ref={starsRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, color: '#f3f4f6', fontFamily: font, minHeight: '100vh' }}>
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 0' }}>

          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="logo-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#2dd4bf', flexShrink: 0 }} />
            ShiftWell
          </div>

          <section style={{ textAlign: 'center', padding: '40px 0 8px' }}>
            <h1 style={{ fontWeight: 800, fontSize: 'clamp(30px, 8.5vw, 46px)', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 16 }}>
              ShiftWell for iPhone is almost here.
            </h1>
            <p style={{ fontSize: 17, color: '#cbd5e1', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 24px' }}>
              The app that knows your rota. Sleep, caffeine and meals planned around your earlies, lates and nights.
            </p>
            <AndroidCard fontFamily={font} />
            <OfferBadge />
            <IosWaitlistForm where="iphone_page" inputId="iphone-email-top" buttonLabel="Join the list" fontFamily={font} joined={joined} onJoined={() => setJoined(true)} />
          </section>

          <Screens />

          <ul style={{ listStyle: 'none', display: 'grid', gap: 10, margin: '8px 0 40px' }}>
            {POINTS.map(p => (
              <li key={p.text} style={{
                display: 'flex', alignItems: 'center', gap: 14, background: '#111827',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px',
              }}>
                <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>{p.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{p.text}</span>
              </li>
            ))}
          </ul>

          <section style={{
            textAlign: 'center', background: 'linear-gradient(135deg, rgba(45,212,191,0.08), rgba(45,212,191,0.03))',
            border: '1px solid rgba(45,212,191,0.25)', borderRadius: 20, padding: '28px 20px', marginBottom: 48,
          }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', marginBottom: 8 }}>Be first when it lands.</h2>
            <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.6, margin: '0 auto 18px', maxWidth: 400 }}>{OFFER}</p>
            <IosWaitlistForm where="iphone_page" inputId="iphone-email-bottom" buttonLabel="Join the list" fontFamily={font} joined={joined} onJoined={() => setJoined(true)} />
          </section>
        </main>

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>© 2026 ShiftWell. Made in Glasgow for shift workers.</p>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Growvia Digital Ltd</p>
        </footer>
      </div>
    </>
  )
}

// Android visitors only (user agent, checked after load like the landing
// page's iPhone link): the web app works for them today, and they can join
// the Android list. iPhone and desktop visitors never see this.
function AndroidCard({ fontFamily }: { fontFamily: string }) {
  const [show, setShow] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  useEffect(() => { setShow(isAndroidUserAgent(navigator.userAgent)) }, [])
  if (!show) return null

  return (
    <div id="android-card" style={{
      textAlign: 'left', background: '#111827', border: '1px solid rgba(45,212,191,0.3)',
      borderRadius: 16, padding: '16px 16px 14px', margin: '0 auto 22px', maxWidth: 420,
    }}>
      <p style={{ fontSize: 14, color: '#e5e7eb', lineHeight: 1.6, margin: '0 0 14px' }}>
        <strong style={{ color: '#f3f4f6' }}>On Android?</strong> You can use ShiftWell right now in your browser, and add it to your home screen like an app. A dedicated Android app is planned.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link
          href="/register"
          onClick={() => trackCtaClick('iphone_page_android')}
          style={{
            display: 'block', textAlign: 'center', background: '#2dd4bf', color: '#090c14', borderRadius: 12,
            padding: '12px 16px', fontFamily, fontWeight: 700, fontSize: 15, textDecoration: 'none',
          }}
        >
          Try it free
        </Link>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            style={{
              background: 'transparent', color: '#f3f4f6', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12,
              padding: '12px 16px', fontFamily, fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Tell me when the Android app launches
          </button>
        )}
      </div>
      {formOpen && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <IosWaitlistForm list="android" where="iphone_page" inputId="android-email" buttonLabel="Tell me" fontFamily={fontFamily} autoFocus />
        </div>
      )}
    </div>
  )
}

function OfferBadge() {
  return (
    <div style={{
      display: 'inline-block', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(245,158,11,0.3)',
      borderRadius: 14, padding: '10px 14px', margin: '0 auto 18px', maxWidth: 420,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fbbf24', marginBottom: 4 }}>
        Founding member offer
      </div>
      <div style={{ fontSize: 14, color: '#fde68a', lineHeight: 1.5 }}>{OFFER}</div>
    </div>
  )
}

// Swipeable row of screenshots with scroll snap (native momentum and swipe
// on phones), plus dots that follow the scroll and can be tapped.
function Screens() {
  const rowRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const centre = row.scrollLeft + row.clientWidth / 2
        let best = 0
        let bestDist = Infinity
        Array.from(row.children).forEach((el, i) => {
          const slide = el as HTMLElement
          const dist = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - centre)
          if (dist < bestDist) { bestDist = dist; best = i }
        })
        setActive(best)
      })
    }
    row.addEventListener('scroll', onScroll, { passive: true })
    return () => { row.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])

  const goTo = (i: number) => {
    const row = rowRef.current
    const slide = row?.children[i] as HTMLElement | undefined
    if (!row || !slide) return
    row.scrollTo({ left: slide.offsetLeft - (row.clientWidth - slide.offsetWidth) / 2, behavior: 'smooth' })
  }

  return (
    <section aria-label="App screenshots" style={{ margin: '36px -16px 20px' }}>
      <div
        ref={rowRef}
        className="shots"
        style={{
          display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory',
          padding: '0 11%', overscrollBehaviorX: 'contain',
        }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.name}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${SLIDES.length}: ${s.name}`}
            style={{ flex: '0 0 100%', scrollSnapAlign: 'center', borderRadius: 20, overflow: 'hidden', background: '#0b1020' }}
          >
            <Image
              src={s.img}
              alt={s.alt}
              sizes="(max-width: 600px) 78vw, 440px"
              placeholder="blur"
              priority={i === 0}
              loading={i === 0 ? undefined : 'eager'}
              draggable={false}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>
        {SLIDES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Show ${s.name} screen`}
            aria-current={active === i ? 'true' : undefined}
            style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer', lineHeight: 0 }}
          >
            <span style={{
              display: 'block', height: 8, borderRadius: 4, transition: 'width 0.2s, background 0.2s',
              width: active === i ? 22 : 8, background: active === i ? '#2dd4bf' : 'rgba(255,255,255,0.25)',
            }} />
          </button>
        ))}
      </div>
    </section>
  )
}
