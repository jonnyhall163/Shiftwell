import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import ShiftWellDemo from '../components/ShiftWellDemo'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { captureReferralCodeFromUrl } from '../lib/referral'
import { trackCtaClick } from '../lib/analytics'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
})

// ── Testimonials ─────────────────────────────────────────────────────────
// Paste real ones in here and they'll render automatically in the trust
// block, beneath the founder quote. Deliberately empty for now: nothing
// invented goes in this array, since a made-up testimonial on a live page
// is worse for trust than no testimonial at all.
//
// Shape, for reference:
//   { quote: "Three weeks in and I've stopped dreading night four.",
//     name: 'Sarah',
//     role: 'ICU Nurse',
//     shiftType: 'Rotating nights' }
type Testimonial = {
  quote: string
  name: string
  role: string
  shiftType: string
}

const TESTIMONIALS: Testimonial[] = []

// While TESTIMONIALS is empty, the layout placeholders render in dev only —
// so the structure is visible while building, but real visitors never see
// half-finished cards. Statically stripped from the production bundle.
const SHOW_TESTIMONIAL_PLACEHOLDERS =
  TESTIMONIALS.length === 0 && process.env.NODE_ENV !== 'production'

export default function Landing() {
  const starsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    captureReferralCodeFromUrl()
  }, [])

  useEffect(() => {
    if (!starsRef.current) return
    const container = starsRef.current
    for (let i = 0; i < 120; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 2 + 0.5
      star.style.cssText = `
        position: absolute;
        background: white;
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        width: ${size}px;
        height: ${size}px;
        animation: twinkle ${2 + Math.random() * 4}s ease-in-out infinite ${Math.random() * 4}s;
        --min-op: ${0.05 + Math.random() * 0.1};
        --max-op: ${0.3 + Math.random() * 0.5};
      `
      container.appendChild(star)
    }
  }, [])

  return (
    <>
      <Head>
        <title>ShiftWell — Built for Shift Workers</title>
        <meta name="description" content="ShiftWell is a wellness app built for shift workers. Sleep guidance, food timing and AI coaching that actually fits your rotation — not a 9-to-5." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: var(--min-op, 0.1); }
            50% { opacity: var(--max-op, 0.6); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 6px #2dd4bf; }
            50% { box-shadow: 0 0 16px #2dd4bf, 0 0 30px rgba(45,212,191,0.4); }
          }
          @keyframes pulseAmber {
            0%, 100% { box-shadow: 0 0 4px #fbbf24; }
            50% { box-shadow: 0 0 12px #fbbf24; }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html { scroll-behavior: smooth; }
          body { background: #090c14; overflow-x: hidden; }
          .fade-up { animation: fadeUp 0.8s ease both; }
          .fade-up-1 { animation: fadeUp 0.8s ease 0.1s both; }
          .fade-up-2 { animation: fadeUp 0.8s ease 0.2s both; }
          .fade-up-3 { animation: fadeUp 0.8s ease 0.3s both; }
          .fade-up-4 { animation: fadeUp 0.8s ease 0.4s both; }
          .fade-up-5 { animation: fadeUp 0.8s ease 0.5s both; }
          .logo-dot { animation: pulse 2s ease-in-out infinite; }
          .pill-dot { animation: pulseAmber 2.5s ease-in-out infinite; }
          .feature-card { transition: border-color 0.2s, transform 0.2s; }
          .feature-card:hover { border-color: rgba(45,212,191,0.25) !important; transform: translateY(-2px); }
          .cta-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(45,212,191,0.3); }
          .cta-primary { transition: transform 0.15s, box-shadow 0.15s; }
          .cta-secondary { transition: border-color 0.2s, background 0.2s; }
          .cta-secondary:hover { border-color: rgba(45,212,191,0.5) !important; background: rgba(45,212,191,0.06) !important; }
          .pricing-card { transition: border-color 0.2s, transform 0.2s; }
          .pricing-card:hover { transform: translateY(-2px); }
        `}</style>
      </Head>

      <div style={{ position: 'fixed', inset: 0, background: '#090c14', zIndex: 0 }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(45,212,191,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 90%, rgba(245,158,11,0.06) 0%, transparent 55%),
          radial-gradient(ellipse 40% 30% at 10% 60%, rgba(99,102,241,0.05) 0%, transparent 50%)
        `
      }} />
      <div ref={starsRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, color: '#f3f4f6', fontFamily: jakarta.style.fontFamily, minHeight: '100vh' }}>

        <nav style={{ padding: '24px 24px 0', maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: jakarta.style.fontFamily, fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="logo-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#2dd4bf', flexShrink: 0 }} />
            ShiftWell
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/login" style={{ color: '#9ca3af', fontSize: 14, textDecoration: 'none', fontWeight: 400 }}>Sign in</Link>
            <Link href="/register" className="cta-primary" onClick={() => trackCtaClick('nav')} style={{
              background: '#2dd4bf', color: '#090c14', borderRadius: 10, padding: '9px 18px',
              fontSize: 13, fontWeight: 700, fontFamily: jakarta.style.fontFamily,
              textDecoration: 'none', whiteSpace: 'nowrap'
            }}>Start free trial</Link>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────── */}
        <section style={{ padding: '72px 24px 56px', textAlign: 'center', maxWidth: 680, margin: '0 auto' }} className="fade-up">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 30,
            background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(245,158,11,0.25)',
            fontSize: 12, fontWeight: 500, color: '#fbbf24', marginBottom: 28, letterSpacing: '0.3px'
          }}>
            <div className="pill-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }} />
            Built for shift workers, by a shift worker
          </div>

          <h1 style={{
            fontFamily: jakarta.style.fontFamily, fontSize: 'clamp(28px, 6vw, 48px)',
            fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.5px',
            marginBottom: 24, color: '#ffffff', padding: '0 16px'
          }}>
            Your life doesn't run<br />
            on a <span style={{ color: '#fbbf24' }}>9-to-5.</span><br />
            Your app <span style={{ color: '#2dd4bf' }}>shouldn't</span> either.
          </h1>

          <p style={{ fontSize: 17, fontWeight: 300, color: '#d1d5db', maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.7 }}>
            ShiftWell wraps <strong style={{ color: '#f3f4f6', fontWeight: 500 }}>sleep guidance, food timing, and daily AI coaching</strong> around your actual shift pattern — not some imaginary routine.
          </p>

          <div className="fade-up-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Link href="/register" className="cta-primary" onClick={() => trackCtaClick('hero')} style={{
              display: 'inline-block', background: '#2dd4bf', color: '#090c14',
              borderRadius: 12, padding: '16px 40px',
              fontFamily: jakarta.style.fontFamily, fontWeight: 700, fontSize: 16, textDecoration: 'none',
            }}>Start your free 14-day trial →</Link>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Card required · £0 today · cancel anytime before your trial ends.</p>
          </div>

          <div className="fade-up-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 32, fontSize: 13, color: '#9ca3af' }}>
            <div style={{ display: 'flex' }}>
              {([['#7c3aed','N'],['#0891b2','J'],['#b45309','S'],['#065f46','R']] as [string,string][]).map(([bg, letter], i) => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: '50%', background: bg,
                  border: '2px solid #090c14', marginLeft: i === 0 ? 0 : -8,
                  fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 600, color: 'white'
                }}>{letter}</div>
              ))}
            </div>
            <span>Join shift workers already using ShiftWell</span>
          </div>
        </section>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>

          {/* ── PROBLEM ───────────────────────────────────────── */}
          <Divider label="The Problem" jakarta={jakarta.style.fontFamily} />

          <div className="fade-up-2" style={{
            background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '28px 32px', marginBottom: 48
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#fbbf24', fontWeight: 600, marginBottom: 14 }}>
              Sound familiar?
            </div>
            <p style={{ fontSize: 16, color: '#d1d5db', lineHeight: 1.8, fontWeight: 300 }}>
              Every health app tells you to <strong style={{ color: '#f3f4f6', fontWeight: 500 }}>sleep by 10pm, eat breakfast at 8am, and go for a morning jog.</strong> But you finished a night shift at 7am. Your watch is buzzing because it thinks you <strong style={{ color: '#f3f4f6', fontWeight: 500 }}>"should"</strong> be asleep right now. Nobody — not MyFitnessPal, not Headspace, not your fitness tracker — has any idea what your body is actually going through.
              <br /><br />
              <strong style={{ color: '#f3f4f6', fontWeight: 500 }}>ShiftWell does.</strong>
            </p>
          </div>

          {/* ── DEMO (moved up: proof before claims) ──────────── */}
          <Divider label="Try it yourself" jakarta={jakarta.style.fontFamily} />

          <div className="fade-up-3" style={{ marginBottom: 64 }}>
            <p style={{ textAlign: 'center', fontSize: 14, color: '#9ca3af', marginBottom: 24, fontWeight: 300 }}>
              Pick your shift and explore the app — no sign up needed.
            </p>
            <ShiftWellDemo />

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <p style={{ fontSize: 15, color: '#d1d5db', marginBottom: 16, fontWeight: 300 }}>
                Like what you see? The real thing knows <strong style={{ color: '#f3f4f6', fontWeight: 500 }}>your</strong> rotation.
              </p>
              <Link href="/register" className="cta-primary" onClick={() => trackCtaClick('post_demo')} style={{
                display: 'inline-block', background: '#2dd4bf', color: '#090c14',
                borderRadius: 12, padding: '15px 34px',
                fontFamily: jakarta.style.fontFamily, fontWeight: 700, fontSize: 15, textDecoration: 'none',
              }}>Start your free trial →</Link>
              <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>Card required · £0 today · cancel anytime before your trial ends.</p>
            </div>
          </div>

          {/* ── FEATURES ──────────────────────────────────────── */}
          <Divider label="What You Get" jakarta={jakarta.style.fontFamily} />

          <div className="fade-up-4" style={{ marginBottom: 64 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 14 }}>
              {[
                {
                  icon: '🌙',
                  title: 'Shift-Aware Sleep',
                  desc: 'Sleep windows based on your actual rotation — not generic bedtime advice that assumes you sleep at night.'
                },
                {
                  icon: '🍽️',
                  title: 'Food That Fits Your Shifts',
                  desc: 'Meal timing built around your rotation — no breakfast, lunch or dinner labels. Dietary preferences baked in so suggestions actually work for you.'
                },
                {
                  icon: '✦',
                  title: 'Daily AI Briefing',
                  desc: 'A personalised briefing every day that knows exactly where you are in your cycle — and what your body needs right now.'
                },
                {
                  icon: '💬',
                  title: 'Your 3am Companion',
                  desc: "Something that's awake when you are. For the moments when you can't sleep and don't want to wake anyone up."
                },
              ].map((f, i) => (
                <div key={i} className="feature-card" style={{
                  background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 22
                }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontFamily: jakarta.style.fontFamily, fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#f3f4f6' }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, fontWeight: 300 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div className="feature-card" style={{
              background: 'linear-gradient(135deg, rgba(45,212,191,0.06), rgba(99,102,241,0.04))',
              border: '1px solid rgba(45,212,191,0.15)',
              borderRadius: 16, padding: 22, display: 'flex', alignItems: 'flex-start', gap: 18
            }}>
              <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>🌙</div>
              <div>
                <div style={{ fontFamily: jakarta.style.fontFamily, fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#f3f4f6' }}>A Community That's Awake When You Are</div>
                <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, fontWeight: 300 }}>
                  3am and everyone's asleep. In the ShiftWell community, someone else is always on shift. Post how your night's going. Heart someone else's. Know you're not alone.
                </div>
              </div>
            </div>
          </div>

          {/* ── TRUST: founder + testimonials ─────────────────── */}
          <Divider label="Why ShiftWell Exists" jakarta={jakarta.style.fontFamily} />

          <div className="fade-up-5" style={{ marginBottom: 64 }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(45,212,191,0.06))',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: 28, textAlign: 'center',
            }}>
              <p style={{ fontSize: 15, color: '#d1d5db', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.75 }}>
                <strong style={{ color: '#f3f4f6', fontWeight: 500, fontStyle: 'normal' }}>"I'm a mechanical engineer on a 4-week rotating shift pattern.</strong> I've spent years trying to use apps that have no idea what my life looks like. So I built ShiftWell — the app I always wished existed."
              </p>
              <div style={{ marginTop: 16, fontSize: 13, color: '#9ca3af' }}>— Jonny, Founder &amp; fellow shift worker 🏴󠁧󠁢󠁳󠁣󠁴󠁿</div>
            </div>

            {TESTIMONIALS.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} style={{
                    background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 16, padding: 22,
                  }}>
                    <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.7, fontWeight: 300, marginBottom: 14 }}>
                      "{t.quote}"
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f3f4f6' }}>{t.name}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>· {t.role}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#2dd4bf',
                        background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)',
                        borderRadius: 20, padding: '2px 9px',
                      }}>{t.shiftType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {SHOW_TESTIMONIAL_PLACEHOLDERS && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                <p style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#f87171', fontWeight: 600, textAlign: 'center' }}>
                  Dev-only placeholders — fill in TESTIMONIALS in pages/index.tsx
                </p>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(248,113,113,0.4)',
                    borderRadius: 16, padding: 22,
                  }}>
                    <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, fontWeight: 300, marginBottom: 14 }}>
                      "[Testimonial {n} quote — real user's own words]"
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#6b7280' }}>[Name]</span>
                      <span style={{ fontSize: 12, color: '#4b5563' }}>· [Role]</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#6b7280',
                        border: '1px dashed rgba(255,255,255,0.15)',
                        borderRadius: 20, padding: '2px 9px',
                      }}>[Shift type]</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── PRICING ───────────────────────────────────────── */}
          <Divider label="Pricing" jakarta={jakarta.style.fontFamily} />

          <div className="fade-up-5" style={{ marginBottom: 64 }}>
            <p style={{ textAlign: 'center', fontSize: 15, color: '#9ca3af', marginBottom: 32, fontWeight: 300 }}>
              14-day free trial on either plan. Card required to start · £0 today · cancel anytime before your trial ends and you won't be charged a penny.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div className="pricing-card" style={{
                background: 'linear-gradient(135deg, rgba(45,212,191,0.08), rgba(45,212,191,0.03))',
                border: '1px solid rgba(45,212,191,0.35)', borderRadius: 20, padding: '28px 24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#2dd4bf', fontWeight: 600 }}>Annual</div>
                  <div style={{ background: '#fbbf24', color: '#090c14', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20 }}>Best value</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontFamily: jakarta.style.fontFamily, fontWeight: 800, fontSize: 40, color: '#f3f4f6' }}>£59.99</span>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>/year</span>
                </div>
                <div style={{ fontSize: 13, color: '#2dd4bf', marginBottom: 24, fontWeight: 500 }}>That's £5/month — you save £36 a year</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {[
                    'Shift-aware daily briefing',
                    'Sleep & hydration tracker',
                    'Food timing + dietary preferences',
                    '3am companion chat',
                    'Routines & exercises',
                    'Shift journal & pattern tracking',
                    'Community feed — shift workers only',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#d1d5db' }}>
                      <span style={{ color: '#2dd4bf', fontSize: 18, lineHeight: 1 }}>✓</span>{item}
                    </div>
                  ))}
                </div>
                <Link href="/register" className="cta-primary" onClick={() => trackCtaClick('pricing_annual')} style={{
                  display: 'block', textAlign: 'center', background: '#2dd4bf', color: '#090c14',
                  borderRadius: 12, padding: '15px 24px',
                  fontFamily: jakarta.style.fontFamily, fontWeight: 700, fontSize: 15, textDecoration: 'none',
                }}>Start free trial →</Link>
              </div>

              <div className="pricing-card" style={{
                background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 24px',
              }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600, marginBottom: 16 }}>Monthly</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontFamily: jakarta.style.fontFamily, fontWeight: 800, fontSize: 40, color: '#f3f4f6' }}>£7.99</span>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>/month</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {[
                    'Shift-aware daily briefing',
                    'Sleep & hydration tracker',
                    'Food timing + dietary preferences',
                    '3am companion chat',
                    'Routines & exercises',
                    'Shift journal & pattern tracking',
                    'Community feed — shift workers only',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#d1d5db' }}>
                      <span style={{ color: '#2dd4bf', fontSize: 18, lineHeight: 1 }}>✓</span>{item}
                    </div>
                  ))}
                </div>
                <Link href="/register" className="cta-secondary" onClick={() => trackCtaClick('pricing_monthly')} style={{
                  display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.04)', color: '#f3f4f6',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12, padding: '15px 24px',
                  fontFamily: jakarta.style.fontFamily, fontWeight: 700, fontSize: 15, textDecoration: 'none',
                }}>Start free trial →</Link>
              </div>

            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 20, lineHeight: 1.7 }}>
              After 14 days, you'll be charged £7.99/mo (or £59.99/yr) unless you cancel.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
              {['✓ 14-day free trial', '✓ Cancel anytime', '✓ No charge if you cancel in time'].map((item, i) => (
                <span key={i} style={{ fontSize: 12, color: '#6b7280' }}>{item}</span>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 12 }}>
              Prices shown in GBP · Charged in your local currency at checkout
            </p>
          </div>

          {/* ── FINAL CTA ─────────────────────────────────────── */}
          <div className="fade-up-5" style={{ textAlign: 'center', padding: '0 0 80px' }}>
            <h2 style={{
              fontFamily: jakarta.style.fontFamily, fontWeight: 800,
              fontSize: 'clamp(22px, 4.5vw, 34px)', letterSpacing: '-0.5px',
              marginBottom: 16, lineHeight: 1.3, padding: '0 16px'
            }}>
              Ready to finally feel like<br />the app gets you?
            </h2>
            <p style={{ fontSize: 15, color: '#9ca3af', marginBottom: 32 }}>Card required · £0 today · cancel anytime before your trial ends.</p>
            <Link href="/register" className="cta-primary" onClick={() => trackCtaClick('footer')} style={{
              display: 'inline-block', background: '#2dd4bf', color: '#090c14',
              borderRadius: 12, padding: '16px 40px',
              fontFamily: jakarta.style.fontFamily, fontWeight: 700, fontSize: 16, textDecoration: 'none'
            }}>Start free trial →</Link>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: '#2dd4bf', textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>

        </div>

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: 12 }}>
            <a href="/privacy" style={{ color: '#64748b', marginRight: 24, fontSize: 14, textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms" style={{ color: '#64748b', marginRight: 24, fontSize: 14, textDecoration: 'none' }}>Terms & Conditions</a>
            <a href="/contact" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>Contact</a>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            © 2026 ShiftWell. Made in Glasgow 🏴󠁧󠁢󠁳󠁣󠁴󠁿 — for every nurse, engineer, officer and worker keeping the world running overnight.
          </p>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Growvia Digital Ltd</p>
        </footer>

      </div>
    </>
  )
}

function Divider({ label, jakarta }: { label: string, jakarta: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '56px 0 48px' }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
      <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap', fontFamily: jakarta }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)' }} />
    </div>
  )
}
