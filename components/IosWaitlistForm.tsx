import { useState } from 'react'
import { trackIosWaitlistJoined, trackAndroidWaitlistJoined, type IosWaitlistWhere } from '../lib/analytics'

// The launch-list form: email field, hidden honeypot, submit button,
// success message and consent line. Used on the landing page and on
// /iphone. Both post entry_point 'landing' (the table only allows
// 'landing' or 'dashboard'); GA's `where` tells the two pages apart.
// list='android' joins the Android app list instead (/iphone's Android card).

type Props = {
  where: Exclude<IosWaitlistWhere, 'dashboard'>
  list?: 'ios' | 'android'
  autoFocus?: boolean
  inputId: string
  buttonLabel: string
  fontFamily: string
  // Lets a page with two forms show both as joined once either one is.
  joined?: boolean
  onJoined?: () => void
}

export default function IosWaitlistForm({ where, list = 'ios', inputId, buttonLabel, fontFamily, joined, onJoined, autoFocus }: Props) {
  const android = list === 'android'
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot, hidden from people
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const done = status === 'done' || !!joined

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status !== 'idle') return
    const value = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || value.length > 254) {
      setError('Please enter a valid email address.')
      return
    }
    setError(null)
    setStatus('sending')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(android
          ? { entry_point: 'landing', list: 'android', email: value, website }
          : { entry_point: 'landing', email: value, website }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setStatus('idle')
        return
      }
      if (android) trackAndroidWaitlistJoined('iphone_page')
      else trackIosWaitlistJoined(where)
      setStatus('done')
      onJoined?.()
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('idle')
    }
  }

  return (
    <>
      {done ? (
        <p role="status" style={{ fontSize: 14, color: '#2dd4bf', fontWeight: 600, margin: 0 }}>
          {android
            ? "You're on the list. We'll email you when the Android app launches."
            : "You're on the list. We'll email you the day it launches."}
        </p>
      ) : (
        <form onSubmit={submit} noValidate style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 420, margin: '0 auto' }}>
          <input
            id={inputId}
            autoFocus={autoFocus}
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-label="Email address"
            placeholder="you@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); if (error) setError(null) }}
            disabled={status === 'sending'}
            style={{
              flex: '1 1 200px', minWidth: 0, background: '#0b1220', color: '#f3f4f6',
              border: `1px solid ${error ? '#f87171' : 'rgba(255,255,255,0.15)'}`, borderRadius: 12,
              padding: '12px 14px', fontSize: 16, outline: 'none',
            }}
          />
          <input
            type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website"
            value={website} onChange={e => setWebsite(e.target.value)}
            style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              flex: '0 0 auto', background: '#2dd4bf', color: '#090c14', border: 'none', borderRadius: 12,
              padding: '12px 20px', fontFamily, fontWeight: 700, fontSize: 15,
              cursor: status === 'sending' ? 'default' : 'pointer', opacity: status === 'sending' ? 0.6 : 1,
            }}
          >
            {status === 'sending' ? 'Adding…' : buttonLabel}
          </button>
        </form>
      )}
      {error && !done && <p role="alert" style={{ fontSize: 13, color: '#f87171', margin: '10px 0 0' }}>{error}</p>}
      <p style={{ fontSize: 12, color: '#6b7280', margin: '14px 0 0' }}>
        {android ? "We'll only email you about the Android app launch." : "We'll only email you about the iPhone launch."}{' '}
        <a href="/privacy#iphone-launch-list" style={{ color: '#9ca3af' }}>Privacy</a>
      </p>
    </>
  )
}
