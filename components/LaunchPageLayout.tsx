import { useEffect, useRef, type ReactNode } from 'react'
import Head from 'next/head'
import { Plus_Jakarta_Sans } from 'next/font/google'

// Shared look for the launch-list pages (/iphone and /android): night-sky
// background with twinkling stars, logo, a narrow centred column and the
// footer. No nav links: these pages have one job each.

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const launchPageFont = jakarta.style.fontFamily

export default function LaunchPageLayout({ children }: { children: ReactNode }) {
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

  return (
    <>
      <Head>
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

      <div style={{ position: 'relative', zIndex: 1, color: '#f3f4f6', fontFamily: launchPageFont, minHeight: '100vh' }}>
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 0' }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="logo-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#2dd4bf', flexShrink: 0 }} />
            ShiftWell
          </div>
          {children}
        </main>

        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>© 2026 ShiftWell. Made in Glasgow for shift workers.</p>
          <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Growvia Digital Ltd</p>
        </footer>
      </div>
    </>
  )
}
