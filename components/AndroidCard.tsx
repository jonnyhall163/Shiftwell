import { useEffect, useState } from 'react'
import Link from 'next/link'
import IosWaitlistForm from './IosWaitlistForm'
import { isAndroidUserAgent } from '../lib/device'
import { trackCtaClick } from '../lib/analytics'

// The web app works on Android today, and there's a list for the Android
// app. On /iphone this shows for Android visitors only (user agent, checked
// after load like the landing page's iPhone link). /android passes
// alwaysShow, so it shows on every device.

type Props = {
  fontFamily: string
  where: 'iphone_page' | 'android_page'
  alwaysShow?: boolean
  // Lets a page with a second Android form show both as joined.
  joined?: boolean
  onJoined?: () => void
}

export default function AndroidCard({ fontFamily, where, alwaysShow, joined, onJoined }: Props) {
  const [show, setShow] = useState(!!alwaysShow)
  const [formOpen, setFormOpen] = useState(false)
  useEffect(() => { if (!alwaysShow) setShow(isAndroidUserAgent(navigator.userAgent)) }, [alwaysShow])
  if (!show) return null

  const open = formOpen || !!joined

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
          onClick={() => trackCtaClick(where === 'android_page' ? 'android_page' : 'iphone_page_android')}
          style={{
            display: 'block', textAlign: 'center', background: '#2dd4bf', color: '#090c14', borderRadius: 12,
            padding: '12px 16px', fontFamily, fontWeight: 700, fontSize: 15, textDecoration: 'none',
          }}
        >
          Try it free
        </Link>
        {!open && (
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
      {open && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <IosWaitlistForm list="android" where={where} inputId="android-email" buttonLabel="Tell me" fontFamily={fontFamily} autoFocus={formOpen} joined={joined} onJoined={onJoined} />
        </div>
      )}
    </div>
  )
}
