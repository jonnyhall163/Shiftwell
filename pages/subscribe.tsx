import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { trackBeginCheckout } from '../lib/analytics'
import { capturePlanFromUrl, getStoredPlan, clearStoredPlan } from '../lib/planPreference'
import type { Plan } from '../lib/planPreference'

export default function Subscribe() {
  const [loading, setLoading] = useState<string | null>(null)
  const [preferredPlan, setPreferredPlan] = useState<Plan>('annual')
  const router = useRouter()
  const { expired } = router.query

  useEffect(() => {
    // Which pricing card they clicked on the landing page. Capture first so
    // a direct /subscribe?plan=monthly link takes precedence over (and
    // refreshes) anything stored earlier in the journey.
    capturePlanFromUrl()
    const stored = getStoredPlan()
    if (stored) setPreferredPlan(stored)
  }, [])

  const handleSubscribe = async (priceId: string, plan: string) => {
    setLoading(plan)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ priceId })
    })

    const data = await res.json()
    if (data.url) {
      // Session exists and we're about to hand off to Stripe. gtag uses
      // sendBeacon, so this survives the navigation below.
      trackBeginCheckout(plan)
      // Preference has served its purpose — don't let it linger and
      // re-order this page on some future visit.
      clearStoredPlan()
      window.location.href = data.url
    } else {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <>
      <Head>
        <title>ShiftWell Pro</title>
      </Head>
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-16">

        {/* Header */}
        <div className="text-center mb-12 max-w-lg">
          {expired && (
            <div className="bg-amber-900/40 border border-amber-700/30 text-amber-300 text-sm rounded-xl px-4 py-3 mb-8">
              Your 14-day trial has ended. Subscribe to keep going.
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-3">
            Keep thriving on shift
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Your AI briefing, sleep tracker, hydration, routines and 3am companion —
            built around your actual shift pattern.
          </p>
        </div>

        {/* Pricing cards — the plan picked on the landing page is shown
            first with the featured treatment; annual keeps its BEST VALUE
            badge either way since that's about the price, not the choice. */}
        <div className="w-full max-w-sm space-y-4">
          {([
            {
              id: 'annual' as Plan,
              name: 'Annual',
              tagline: '2 months free',
              price: '£59.99',
              per: 'per year',
              note: '= £5.00/mo',
              badge: 'BEST VALUE',
              priceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
              planKey: 'yearly',
            },
            {
              id: 'monthly' as Plan,
              name: 'Monthly',
              tagline: 'Cancel anytime',
              price: '£7.99',
              per: 'per month',
              note: null,
              badge: null,
              priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
              planKey: 'monthly',
            },
          ]
            .sort((a, b) => (a.id === preferredPlan ? -1 : b.id === preferredPlan ? 1 : 0))
          ).map(card => {
            const featured = card.id === preferredPlan
            return (
              <div
                key={card.id}
                className={`rounded-2xl p-6 relative ${
                  featured
                    ? 'bg-teal-950/60 border-2 border-teal-500/50'
                    : 'bg-gray-900 border border-gray-800'
                }`}
              >
                {card.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-gray-950 text-xs font-bold px-3 py-1 rounded-full">
                    {card.badge}
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-bold text-lg">{card.name}</p>
                    <p className="text-gray-400 text-sm">{card.tagline}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-2xl">{card.price}</p>
                    <p className="text-gray-500 text-xs">{card.per}</p>
                    {card.note && <p className="text-teal-400 text-xs">{card.note}</p>}
                  </div>
                </div>
                <button
                  onClick={() => handleSubscribe(card.priceId, card.planKey)}
                  disabled={loading !== null}
                  className={`w-full font-bold py-3 rounded-xl transition disabled:opacity-50 ${
                    featured
                      ? 'bg-teal-500 hover:bg-teal-400 text-gray-950'
                      : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                  }`}
                >
                  {loading === card.planKey ? 'Loading...' : 'Start 14-day free trial →'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Features list */}
        <div className="mt-10 max-w-sm w-full">
          <p className="text-gray-600 text-xs text-center mb-4">Everything included in ShiftWell Pro</p>
          <div className="space-y-2">
            {[
              '☀️ Daily AI briefing based on your rotation',
              '🌙 Sleep tracker built for fragmented sleep',
              '💧 Hydration tracker with shift-aware reminders',
              '⚡ Shift-aware workout routines with timers',
              '🍽️ Meal timing guide — no breakfast/lunch/dinner',
              '💬 3am companion — always awake when you are',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-gray-700 text-xs mt-10 text-center max-w-xs">
          14-day free trial. Card required to start trial. Cancel anytime before trial ends and you won't be charged.
        </p>

      </div>
    </>
  )
}
