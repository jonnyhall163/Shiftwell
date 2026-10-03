import { useState } from 'react'
import Head from 'next/head'
import AndroidCard from '../components/AndroidCard'
import IosWaitlistForm from '../components/IosWaitlistForm'
import LaunchPageLayout, { launchPageFont } from '../components/LaunchPageLayout'
import { SITE_NAME, OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, OG_IMAGE_ALT, absoluteUrl } from '../lib/seo'

// Shareable Android page. Shows the Android view to everyone, on any device
// (no user-agent check): the web app works on Android today, here's how to
// put it on your home screen, and here's the list for the Android app.
// Sign-ups save exactly what /iphone's Android card saves (source
// android_waitlist, entry_point landing). Query strings such as ?ref= are
// left alone, as on /iphone: GA records them with the page view.

const PAGE_TITLE = 'ShiftWell on Android'
const PAGE_DESCRIPTION = 'The app that knows your rota. Use it on Android today in your browser, and join the list for the Android app.'

const STEPS = [
  'Tap Try it free and create your account.',
  'In Chrome, tap the ⋮ menu at the top right.',
  'Tap Add to Home screen (or Install app).',
  'Open ShiftWell from your home screen, like any other app.',
]

export default function AndroidPage() {
  const [joined, setJoined] = useState(false)
  const font = launchPageFont

  return (
    <LaunchPageLayout>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link rel="canonical" href={absoluteUrl('/android')} />

        {/* Same keys as the defaults in _app.tsx, so these replace them.
            The share image is the site's default card: /iphone's says
            "ShiftWell for iPhone". */}
        <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
        <meta property="og:url" content={absoluteUrl('/android')} key="og:url" />
        <meta property="og:title" content={PAGE_TITLE} key="og:title" />
        <meta property="og:description" content={PAGE_DESCRIPTION} key="og:description" />
        <meta property="og:image" content={OG_IMAGE} key="og:image" />
        <meta property="og:image:width" content={OG_IMAGE_WIDTH} key="og:image:width" />
        <meta property="og:image:height" content={OG_IMAGE_HEIGHT} key="og:image:height" />
        <meta property="og:image:alt" content={OG_IMAGE_ALT} key="og:image:alt" />
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:title" content={PAGE_TITLE} key="twitter:title" />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} key="twitter:description" />
        <meta name="twitter:image" content={OG_IMAGE} key="twitter:image" />
        <meta name="twitter:image:alt" content={OG_IMAGE_ALT} key="twitter:image:alt" />
      </Head>

      <section style={{ textAlign: 'center', padding: '40px 0 8px' }}>
        <h1 style={{ fontWeight: 800, fontSize: 'clamp(30px, 8.5vw, 46px)', lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 16 }}>
          ShiftWell on Android
        </h1>
        <p style={{ fontSize: 17, color: '#cbd5e1', lineHeight: 1.6, maxWidth: 460, margin: '0 auto 24px' }}>
          The app that knows your rota. Sleep, caffeine and meals planned around your earlies, lates and nights.
        </p>
        <AndroidCard fontFamily={font} where="android_page" alwaysShow joined={joined} onJoined={() => setJoined(true)} />
      </section>

      <section aria-labelledby="home-screen-help" style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
        padding: '18px 18px 16px', margin: '8px auto 24px', maxWidth: 420,
      }}>
        <h2 id="home-screen-help" style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px', marginBottom: 12 }}>
          Add it to your home screen
        </h2>
        <ol style={{ listStyle: 'none', display: 'grid', gap: 10 }}>
          {STEPS.map((step, i) => (
            <li key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{
                flex: '0 0 auto', width: 24, height: 24, borderRadius: '50%', background: 'rgba(45,212,191,0.15)',
                color: '#2dd4bf', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{i + 1}</span>
              <span style={{ fontSize: 15, color: '#e5e7eb', lineHeight: 1.5 }}>{step}</span>
            </li>
          ))}
        </ol>
        <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginTop: 12 }}>
          Using Samsung Internet? Tap the menu, then Add page to, then Home screen.
        </p>
      </section>

      <section style={{
        textAlign: 'center', background: 'linear-gradient(135deg, rgba(45,212,191,0.08), rgba(45,212,191,0.03))',
        border: '1px solid rgba(45,212,191,0.25)', borderRadius: 20, padding: '28px 20px', margin: '0 auto 48px', maxWidth: 420,
      }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', marginBottom: 8 }}>Want the Android app?</h2>
        <p style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.6, margin: '0 auto 18px', maxWidth: 400 }}>
          {"A dedicated Android app is planned. Leave your email and we'll tell you when it launches."}
        </p>
        <IosWaitlistForm list="android" where="android_page" inputId="android-email-bottom" buttonLabel="Tell me" fontFamily={font} joined={joined} onJoined={() => setJoined(true)} />
      </section>
    </LaunchPageLayout>
  )
}
