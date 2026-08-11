import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { captureReferralCodeFromUrl, getStoredReferralCode, clearStoredReferralCode } from '../lib/referral'

// Profile row creation now happens server-side, via a DB trigger on
// auth.users insert (see supabase/migrations/20260812000000_profile_on_signup_trigger.sql) —
// it fires regardless of whether email confirmation is enabled, and doesn't
// depend on this client JS running at all. What's left here is purely
// defensive: confirming the row actually landed before sending someone into
// onboarding, so a failure is surfaced instead of silently continuing.
async function waitForProfile(userId: string, attempts = 5, delayMs = 400): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    const { data } = await supabase
      .from('shiftwell_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (data) return true
    if (i < attempts - 1) await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return false
}

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // In case someone lands directly on /register?ref=CODE without ever
    // visiting the landing page first.
    captureReferralCodeFromUrl()
  }, [])

  const finishSetup = async (userId: string) => {
    // Belt-and-braces: the trigger should already have created the row, but
    // we do have a session at this point, so a client-side upsert is also
    // safe under RLS (auth.uid() = id) if for any reason the trigger hasn't
    // run yet — cheap self-heal before we give up and show an error.
    await supabase.from('shiftwell_profiles').upsert({ id: userId, email, full_name: name || undefined })

    const ready = await waitForProfile(userId)
    if (ready) {
      router.push('/onboarding')
      return
    }

    setPendingUserId(userId)
    setError("We couldn't finish setting up your account. Your login works, but setup didn't complete — please retry.")
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const referredBy = getStoredReferralCode()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, app: 'shiftwell', ...(referredBy ? { referred_by: referredBy } : {}) }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Something went wrong creating your account. Please try again.')
      setLoading(false)
      return
    }

    // Signup succeeded — the code (if any) has been handed off in the auth
    // metadata for the DB trigger to validate and record. Nothing more to
    // do with it client-side either way.
    clearStoredReferralCode()

    if (!data.session) {
      // Email confirmation is enabled — there's no session yet, so any
      // client-side write would fail RLS regardless. The DB trigger already
      // created the profile row at auth.users insert time; the user just
      // needs to confirm their email before they can log in.
      setLoading(false)
      setAwaitingConfirmation(true)
      return
    }

    await finishSetup(data.user.id)
  }

  const handleRetry = async () => {
    if (!pendingUserId) return
    setLoading(true)
    setError(null)
    await finishSetup(pendingUserId)
  }

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📬</div>
          <h2 className="text-2xl font-bold text-white mb-3">Check your email</h2>
          <p className="text-gray-400">
            We've sent a confirmation link to <span className="text-white">{email}</span>.
            Confirm your account, then sign in to finish setting up your shift pattern.
          </p>
          <Link href="/login" className="mt-6 inline-block text-teal-400 hover:text-teal-300">
            Back to login →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-teal-400" style={{ boxShadow: '0 0 6px #2dd4bf' }} />
            <span className="text-white font-bold text-lg">ShiftWell</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Start your free trial</h1>
          <p className="text-gray-400 text-sm mt-2">14 days free. Cancel within that time and pay nothing.</p>
        </div>

        <form onSubmit={handleRegister} className="bg-gray-900 rounded-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-900/40 text-red-300 text-sm rounded-lg px-4 py-3 space-y-2">
              <p>{error}</p>
              {pendingUserId && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={loading}
                  className="text-red-200 font-semibold underline disabled:opacity-50"
                >
                  {loading ? 'Retrying...' : 'Retry'}
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="First name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Min. 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !!pendingUserId}
            className="w-full bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Start free trial →'}
          </button>

          <p className="text-center text-xs text-gray-600 leading-relaxed">
            By signing up you agree to our{' '}
            <Link href="/terms" className="text-gray-500 hover:text-gray-300">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-gray-500 hover:text-gray-300">Privacy Policy</Link>
          </p>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-teal-400 hover:text-teal-300">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
