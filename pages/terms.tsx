import LegalLayout, { A, COMPANY, H2, Mail } from '../components/LegalLayout'

// Covers the website and the iPhone app. Plans and prices reflect the app's
// lib/paywall.ts and lib/entitlements.ts (jonnyhall163/shiftwell-native) and
// the website's Stripe checkout (7-day trial, £7.99 a month, £59.99 a year).

export default function Terms() {
  return (
    <LegalLayout title="Terms of Use" description="The terms for using ShiftWell on the website and in the iPhone app.">
      <H2>About these terms</H2>
      <p>
        These terms are an agreement between you and {COMPANY.name} (company number {COMPANY.number}, registered office {COMPANY.office}), which runs ShiftWell.
        They cover the ShiftWell website (getshiftwell.com) and the ShiftWell iPhone app. By creating an account or using ShiftWell, you agree to them.
        If you don&apos;t agree, please don&apos;t use ShiftWell.
      </p>
      <p>How we handle your data is explained in our <A href="/privacy">Privacy Policy</A>.</p>

      <H2>Who can use ShiftWell</H2>
      <ul>
        <li>You must be 16 or older.</li>
        <li>One account per person. Keep your login details safe and don&apos;t share your account.</li>
        <li>Give accurate details when you sign up, and keep your email address up to date.</li>
      </ul>

      <H2>ShiftWell is not medical advice</H2>
      <div className="box">
        <p>ShiftWell gives general wellbeing guidance for people who work shifts. It is not a medical device, and it doesn&apos;t diagnose, treat or prevent any condition.</p>
        <p>Your daily briefing, the Companion and rota photo reading use AI (Claude, made by Anthropic). AI can be wrong, can misread a rota and can say things that don&apos;t fit your situation. Always check your rota against the real thing, and use your own judgement.</p>
        <p>Talk to a doctor or other health professional about any health worries, and before making big changes to your sleep, diet or medication.</p>
        <p style={{ marginBottom: 0 }}>The Companion is not a therapist or a crisis service. If you are in crisis, call Samaritans on 116 123 (UK) or 988 (US and Canada), or 999 or 911 in an emergency.</p>
      </div>

      <H2>Free and Pro</H2>
      <p>ShiftWell comes in two versions:</p>
      <ul>
        <li><strong>Free:</strong> in the iPhone app, the basics stay free: your rota, sleep and caffeine logging, your meal plan and caffeine cut-off, reminders, and a few Companion chats each month.</li>
        <li><strong>Pro:</strong> everything, including your daily AI briefing, the weekly recap and unlimited Companion chats. On the website, ShiftWell is available with Pro only.</li>
      </ul>
      <p>What&apos;s included in each version is shown in the app and on the website, and we may change it from time to time. If we take away something you&apos;ve paid for, we&apos;ll tell you in advance.</p>

      <H2>Subscriptions bought in the iPhone app</H2>
      <ul>
        <li>Pro is a monthly or yearly subscription bought through Apple&apos;s App Store. The price is shown in the app before you buy, in your local currency.</li>
        <li>A free trial may be offered. If you don&apos;t cancel before it ends, your subscription starts and you are charged.</li>
        <li>Apple takes payment and renews your subscription automatically until you cancel. Cancel at least 24 hours before it renews in your iPhone&apos;s Settings: tap your name, then Subscriptions.</li>
        <li>Refunds for App Store purchases are handled by Apple under its own rules: <A href="https://reportaproblem.apple.com">reportaproblem.apple.com</A>.</li>
        <li>Deleting your ShiftWell account doesn&apos;t cancel an App Store subscription.</li>
        <li>
          If you use ShiftWell on an Apple device, Apple&apos;s standard Licensed Application End User License Agreement
          (<A href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">apple.com/legal/internet-services/itunes/dev/stdeula</A>) also applies.
          If it conflicts with these terms, these terms apply as far as the law and Apple allow. Apple isn&apos;t responsible for ShiftWell or for supporting it; we are.
        </li>
      </ul>

      <H2>Subscriptions bought on the website</H2>
      <ul>
        <li>Pro costs £7.99 a month or £59.99 a year, including any VAT.</li>
        <li>New subscriptions include a 7-day free trial. A card is needed to start it, and you aren&apos;t charged until the trial ends. Cancel before then and you pay nothing.</li>
        <li>Payments are taken by Stripe. Your subscription renews automatically until you cancel.</li>
        <li>Cancel any time from your account (Subscription), which opens Stripe&apos;s customer portal. You keep Pro until the end of the period you&apos;ve paid for.</li>
        <li>We don&apos;t give refunds for part of a period, except where the law says we must.</li>
        <li>If we change the price, we&apos;ll tell you at least 30 days before it affects you, and you can cancel before then.</li>
      </ul>
      <p>
        <strong>Your right to cancel (UK):</strong> if you&apos;re a consumer in the UK, you normally have 14 days to change your mind about a new subscription.
        By starting your subscription, you ask us to give you Pro straight away. If you cancel within those 14 days after you&apos;ve been charged, email <Mail /> and we&apos;ll refund you,
        minus a fair amount for the time you&apos;ve already used.
      </p>

      <H2>Acceptable use</H2>
      <p>When using ShiftWell, you agree not to:</p>
      <ul>
        <li>break the law, or use ShiftWell to harm, harass or deceive anyone;</li>
        <li>post anything in Community that is abusive, hateful, sexual, illegal, or someone else&apos;s private information;</li>
        <li>try to get round the paywall, the limits on Companion chats or rota photos, or any security measure;</li>
        <li>copy, resell, scrape or reverse engineer ShiftWell, or use it to build a competing product;</li>
        <li>send the Companion or the rota reader anything designed to break or misuse them, or upload photos that aren&apos;t of a rota;</li>
        <li>overload or attack our systems.</li>
      </ul>
      <p>You&apos;re responsible for anything you post in Community. We can remove posts that break these rules.</p>

      <H2>Our content and yours</H2>
      <p>
        ShiftWell, its design and its content belong to {COMPANY.name}. We give you a personal, non-transferable right to use ShiftWell for yourself while you have an account.
        What you log and write is yours. You give us permission to store and use it only to run ShiftWell for you, as our Privacy Policy explains, and, for Community posts, to show them to other ShiftWell users.
      </p>

      <H2>When things go wrong</H2>
      <ul>
        <li>We work hard to keep ShiftWell running and accurate, but we can&apos;t promise it will always be available, error-free, or right for you.</li>
        <li>We&apos;re not responsible for losses we couldn&apos;t reasonably have foreseen, for business losses, or for decisions you make based on ShiftWell&apos;s guidance or AI content.</li>
        <li>If we are responsible for a loss, our total liability to you is limited to the amount you&apos;ve paid us for ShiftWell in the 12 months before it happened, or £50 if that is more.</li>
        <li>Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law doesn&apos;t allow us to limit. If you&apos;re a consumer, these terms don&apos;t affect your legal rights.</li>
      </ul>

      <H2>Ending your account</H2>
      <ul>
        <li>You can stop using ShiftWell and delete your account at any time: in the iPhone app, go to Settings, then Account, then Delete account, or email <Mail />.</li>
        <li>We can suspend or close an account that seriously or repeatedly breaks these terms. Unless it&apos;s urgent or the law stops us, we&apos;ll tell you first and give you a chance to put it right. If we close a paid account without good reason, we&apos;ll refund the unused part of your subscription.</li>
      </ul>

      <H2>Changes to these terms</H2>
      <p>We may update these terms, for example when we add features or the law changes. We&apos;ll update the date at the top, and for important changes we&apos;ll tell you by email or in the app before they take effect. If you don&apos;t agree, you can cancel and delete your account.</p>

      <H2>Law and disputes</H2>
      <p>
        These terms are governed by Scots law, and disputes go to the Scottish courts. If you live elsewhere in the UK, you can also bring a claim in the courts where you live,
        and you keep the protection of your local consumer law. If you have a problem, please email <Mail /> first and we&apos;ll do our best to sort it out.
      </p>

      <H2>Contact</H2>
      <p>{COMPANY.name}, {COMPANY.office}. Email <Mail />.</p>
    </LegalLayout>
  )
}
