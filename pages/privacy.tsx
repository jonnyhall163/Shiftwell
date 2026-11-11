import LegalLayout, { A, COMPANY, H2, H3, Mail } from '../components/LegalLayout'
import { openCookieSettings } from '../components/CookieConsent'

// Covers the website and the iPhone app. Every statement about the app was
// checked against jonnyhall163/shiftwell-native (11 Nov 2026): the briefing,
// companion, rota-from-photo and delete-account Edge Functions, lib/health.ts,
// lib/sleepLog.ts, lib/companionStore.ts, lib/aiConsent.ts, lib/purchases.ts,
// lib/notifications.ts and lib/analytics.ts. If what the app collects or
// sends to the AI changes, change this page with it.

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" description="How ShiftWell collects, uses and protects your data on the website and in the iPhone app.">
      <div className="box">
        <p style={{ fontWeight: 700 }}>The short version</p>
        <ul style={{ marginBottom: 0 }}>
          <li>We collect what ShiftWell needs to plan your sleep, food and caffeine around your shifts, and nothing for advertising.</li>
          <li>We never sell your data, and we never use your Apple Health data for advertising.</li>
          <li>Your daily briefing and Companion replies are written by AI. In the app, we only send your details to the AI company (Anthropic) after you say yes.</li>
          <li>Rota photos are read once and never stored.</li>
          <li>You can delete your account in the app at any time: Settings, then Account, then Delete account.</li>
        </ul>
      </div>

      <H2>Who we are</H2>
      <p>
        ShiftWell is run by {COMPANY.name}, a company registered in Scotland (company number {COMPANY.number}), registered office {COMPANY.office}.
        We are the controller of your personal data, which means we decide how it is used and we are responsible for it.
      </p>
      <p>Questions, requests or complaints: <Mail />.</p>

      <H2>What this policy covers</H2>
      <p>
        This policy covers the ShiftWell website (getshiftwell.com, including the web app at getshiftwell.com/dashboard) and the ShiftWell iPhone app.
        Both use the same ShiftWell account. Where something only applies to one of them, we say so.
      </p>

      <H2>What we collect and why</H2>

      <H3>Your account</H3>
      <ul>
        <li>Your email address and password, so you can sign in. Passwords are stored by our database provider in a scrambled (hashed) form. We can never see them.</li>
        <li>Your first name, so the app can greet you and the briefing can use your name.</li>
      </ul>

      <H3>Your shifts and life context</H3>
      <ul>
        <li>Your shift pattern or rota, shift times and any time off you add.</li>
        <li>Life context you choose to add: whether you have children and your school run time, a time you must be up by, notes about your life, and dietary requirements.</li>
      </ul>
      <p>We use these to work out your sleep, meal and caffeine timings and to write your daily briefing.</p>

      <H3>Things you log</H3>
      <ul>
        <li>Sleep you log by hand (start, end, and whether it was a main sleep or a nap).</li>
        <li>Caffeinated drinks you log, with the time.</li>
        <li>Shift journal entries: how a shift went (a rating from 1 to 5) and any note you write.</li>
        <li>On the website only: a daily water count and routines you tick off.</li>
      </ul>

      <H3>Apple Health (iPhone app only)</H3>
      <p>If you allow it, the app reads sleep, steps, heart rate and resting heart rate from Apple Health. See the <A href="#apple-health">Apple Health</A> section below for exactly what happens to it.</p>

      <H3>Rota photos (iPhone app only)</H3>
      <p>If you choose to snap a photo of your rota, we send it to our AI provider to read your shift pattern. See <A href="#rota-photos">Rota photos</A>.</p>

      <H3>Companion messages</H3>
      <p>Messages you send to the Companion, our AI chat. See <A href="#companion">Companion chats</A>.</p>

      <H3>Your AI choice</H3>
      <p>In the app, whether you said yes or no to AI features, and when. We keep this with your login so it follows your account to a new phone.</p>

      <H3>Reminders</H3>
      <p>
        The app&apos;s shift reminders are scheduled on your phone itself. We don&apos;t collect a push notification token or any other device identifier for them,
        and we don&apos;t send notifications from our servers.
      </p>

      <H3>Subscriptions and payments</H3>
      <ul>
        <li><strong>In the iPhone app:</strong> subscriptions are bought through Apple. RevenueCat, our subscription service, tells the app whether your subscription is active. It links this to your ShiftWell account ID, not your name or email. We never see your card details.</li>
        <li><strong>On the website:</strong> payments are taken by Stripe. We keep your Stripe customer ID, your subscription status and your trial dates. We never see or store your card details.</li>
      </ul>

      <H3>Community (website only for now)</H3>
      <p>
        If you post in Community, we store your post with your first name, the role and shift type you give, and any hearts or reports.
        Other ShiftWell users can see your post, your first name, role and shift type. Community is not in the iPhone app at launch.
      </p>

      <H3>Referrals</H3>
      <p>If you join through a friend&apos;s referral link, we record whose code you used, so we can give them their reward.</p>

      <H3>Launch lists</H3>
      <p>See <A href="#iphone-launch-list">Launch lists</A>.</p>

      <H3>Website analytics</H3>
      <p>
        If you tap Accept on our cookie banner, the website uses Google Analytics to count visits and see which pages and buttons are used: pages viewed, the device and browser you use,
        roughly where you are (from your IP address) and events such as starting a trial or joining a launch list. See <A href="#cookies">Cookies</A>.
      </p>
      <p><strong>The iPhone app has no analytics or tracking service at all.</strong> Nothing about how you use the app is sent to an analytics company.</p>

      <H3>Technical logs</H3>
      <p>Our hosting and database providers keep short-lived technical logs (such as IP address, time and the page or function requested) to keep the service running and secure. We don&apos;t use them to track you.</p>

      <H2 id="cookies">Cookies</H2>
      <p>
        The website only sets Google Analytics cookies if you tap Accept on the cookie banner. If you tap Reject, or don&apos;t choose, Google Analytics isn&apos;t loaded at all.
        We remember your choice in your browser. The website also stores a few small settings in your browser that it needs to work, such as keeping you signed in
        and remembering a referral code, and these are not used for tracking.
      </p>
      <p>
        <button
          type="button"
          onClick={openCookieSettings}
          style={{ background: 'transparent', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.5)', borderRadius: 10, padding: '8px 14px', fontSize: 15, cursor: 'pointer' }}
        >
          Cookie settings
        </button>
      </p>

      <H2 id="apple-health">Apple Health</H2>
      <p>The app only reads from Apple Health, and only after you give permission in Apple&apos;s Health permission screen. It never writes anything to Apple Health.</p>
      <table>
        <thead><tr><th>What</th><th>What happens to it</th></tr></thead>
        <tbody>
          <tr>
            <td>Sleep</td>
            <td>Your sleep sessions (start and end time, and whether it was a main sleep or a nap) are saved to your ShiftWell account, so your sleep shows next to your shifts and the briefing knows how you slept.</td>
          </tr>
          <tr>
            <td>Steps, heart rate and resting heart rate</td>
            <td>Read on your phone and summarised (for example, steps so far today, and resting heart rate compared with your own last 14 days). These summaries are not saved to your ShiftWell account.</td>
          </tr>
        </tbody>
      </table>
      <p><strong>Our promises about Apple Health data:</strong></p>
      <ul>
        <li>We never use it for advertising or marketing.</li>
        <li>We never sell it.</li>
        <li>We only use it to run ShiftWell for you: your sleep screens, your weekly recap and your daily briefing.</li>
        <li>
          The only company we share it with is Anthropic, our AI provider, and only to write <em>your</em> briefing, your weekly recap line or <em>your</em> Companion reply,
          and only if you have said yes to AI. What&apos;s sent: today&apos;s step and resting heart rate summaries, and your recent sleep (up to your last 5 sleeps, as date, length and main sleep or nap).
          It is also stored by our database provider, Supabase, as part of running the service.
        </li>
      </ul>
      <p>You can turn off ShiftWell&apos;s access at any time in the Health app (tap your profile picture, then Apps, then ShiftWell) or in your iPhone&apos;s Settings (Privacy &amp; Security, then Health, then ShiftWell). Sleep already saved to your account stays there until you delete it or delete your account.</p>

      <H2 id="ai">AI and Anthropic</H2>
      <p>
        Your daily briefing, the Companion, the weekly recap line and rota photo reading are written by Claude, an AI made by Anthropic.
        Requests go from our servers to Anthropic. Anthropic processes the data only to give us the response, and under its commercial terms it doesn&apos;t use it to train its AI models.
      </p>
      <p><strong>In the iPhone app,</strong> nothing is sent to the AI until you say yes on the &quot;OK to use AI?&quot; screen. You can change your answer at any time in Settings. If you say no, the AI features are switched off and everything else still works. Our servers also check your answer, so nothing is sent without it.</p>
      <p>When AI is on, each briefing or Companion message can include:</p>
      <ul>
        <li>your first name, your rota, shift times, today&apos;s shift and time off;</li>
        <li>your life context: children and school run time, a time you must be up by, life notes and dietary requirements;</li>
        <li>your recent sleep (from Apple Health or logged by hand) and your last 5 shift journal entries, including any notes;</li>
        <li>today&apos;s caffeine and your meal timings;</li>
        <li>today&apos;s Apple Health step and resting heart rate summaries, if you connected Apple Health;</li>
        <li>for the Companion, the conversation so far that day.</li>
      </ul>
      <p>
        <strong>On the website,</strong> the briefing and Companion send your first name, your rota and today&apos;s shift and your life context.
        The briefing also sends your dietary requirements, and the Companion sends your messages. The website doesn&apos;t send your sleep, journal or water logs to the AI.
        Using the AI features on the website is part of the service you sign up for there.
      </p>

      <H2 id="rota-photos">Rota photos</H2>
      <p>
        If you choose &quot;Use a photo&quot;, the photo of your rota is sent securely through our server to Anthropic, which reads the shift pattern and sends it back.
        <strong> The photo is never stored:</strong> not in our database, not in file storage and not in our logs. Only the rota it reads is saved, after you check and confirm it.
        We ask before every photo, and you can always set up your rota by hand instead. To limit misuse, we count how many photos you send each day (up to 5).
      </p>

      <H2 id="companion">Companion chats</H2>
      <ul>
        <li><strong>iPhone app:</strong> today&apos;s conversation is kept on your phone only, and is cleared the next day. Each time you send a message, the conversation so far (up to the last 20 messages) is sent through our server to Anthropic to get a reply. We don&apos;t save Companion conversations on our servers.</li>
        <li><strong>Website:</strong> the conversation exists only while the page is open, and each message is sent to Anthropic in the same way. We don&apos;t save it on our servers.</li>
      </ul>
      <p>The Companion is not a therapist or a crisis service. If you are in crisis, call Samaritans on 116 123 (UK) or 988 (US and Canada), or 999 or 911 in an emergency.</p>

      <H2 id="iphone-launch-list">Launch lists</H2>
      <p>If you join our iPhone launch list, we store your email address and the time you joined, only to tell you when the iPhone app launches.</p>
      <p>Founding member offer: the first 100 people to join the iPhone list get 2 months free when the iPhone app launches. We use the time you joined to tell who the first 100 are. If you&apos;re one of them, your offer comes in the launch email.</p>
      <p>If you join our Android app list, we store your email address only to tell you when the Android app launches.</p>
      <p>You can ask to be removed from either list at any time by emailing <Mail /> or through our <A href="/contact">contact page</A>.</p>

      <H2>Who we share it with</H2>
      <p>We never sell your data. We share it only with the companies that help us run ShiftWell, and only what each one needs:</p>
      <table>
        <thead><tr><th>Company</th><th>What they do for us</th><th>Where</th></tr></thead>
        <tbody>
          <tr><td>Supabase</td><td>Our database and sign-in, and the server functions the iPhone app uses (including its requests to the AI). Holds your account and everything you log.</td><td>Database in London, UK</td></tr>
          <tr><td>Anthropic</td><td>The AI that writes your briefing, Companion replies, recap line and reads rota photos.</td><td>USA</td></tr>
          <tr><td>RevenueCat</td><td>Checks your App Store subscription status (iPhone app).</td><td>USA</td></tr>
          <tr><td>Apple</td><td>Takes App Store payments and provides Apple Health. Apple handles your payment under its own privacy policy.</td><td>Ireland and USA</td></tr>
          <tr><td>Stripe</td><td>Takes payments on the website. Stripe handles your card details under its own privacy policy.</td><td>Ireland and USA</td></tr>
          <tr><td>Resend</td><td>Sends account emails, such as password resets.</td><td>USA</td></tr>
          <tr><td>Vercel</td><td>Hosts the website and its server functions (including the website&apos;s requests to the AI and to Stripe).</td><td>USA</td></tr>
          <tr><td>Google Analytics</td><td>Website visit statistics (website only, and only if you accept cookies).</td><td>USA</td></tr>
        </tbody>
      </table>
      <p>We may also share data if the law requires it, or to protect someone&apos;s safety. If ShiftWell is ever sold, your data would pass to the new owner under this policy, and we would tell you first.</p>

      <H2>Data sent outside the UK</H2>
      <p>
        Your account data is stored in London. Some of the companies above are in the USA, so data sent to them leaves the UK.
        When that happens we rely on the UK&apos;s legal safeguards: UK adequacy regulations, including the UK-US data bridge for companies certified under it,
        or the UK&apos;s approved contract terms (the International Data Transfer Agreement or the UK Addendum to the EU standard contractual clauses).
        Data is encrypted in transit.
      </p>

      <H2>Our legal basis (UK GDPR)</H2>
      <table>
        <thead><tr><th>Why</th><th>Legal basis</th></tr></thead>
        <tbody>
          <tr><td>Your account, your rota, logging, plans and subscriptions</td><td>Contract: we need it to provide ShiftWell to you.</td></tr>
          <tr><td>Apple Health data, and sending your details to the AI in the app</td><td>Explicit consent. Health data is special category data, so we only use it with your explicit consent: the Apple Health permission and the in-app &quot;OK to use AI?&quot; choice. You can withdraw either at any time.</td></tr>
          <tr><td>Sending your details to the AI on the website</td><td>Contract: the briefing and Companion are part of the website service you sign up for.</td></tr>
          <tr><td>Rota photos</td><td>Consent, given each time you choose &quot;Use a photo&quot;.</td></tr>
          <tr><td>Launch lists</td><td>Consent, given when you join. You can withdraw it at any time.</td></tr>
          <tr><td>Website statistics (Google Analytics)</td><td>Consent, given by tapping Accept on the cookie banner. You can change it at any time with Cookie settings.</td></tr>
          <tr><td>Keeping ShiftWell secure and preventing misuse</td><td>Legitimate interests: running a safe, working service. You can object at any time.</td></tr>
          <tr><td>Payment and tax records</td><td>Legal obligation.</td></tr>
        </tbody>
      </table>

      <H2>How long we keep it</H2>
      <ul>
        <li><strong>Your account and everything you log:</strong> for as long as you have an account. When you delete your account it&apos;s deleted straight away.</li>
        <li><strong>Backups:</strong> copies in our database provider&apos;s backups are overwritten on their normal cycle, within 30 days.</li>
        <li><strong>Rota photos:</strong> never stored.</li>
        <li><strong>Companion chats:</strong> on your phone until the end of the day; not stored on our servers.</li>
        <li><strong>Launch lists:</strong> until you unsubscribe or ask us to delete your email.</li>
        <li><strong>Referral records:</strong> we keep a record that a referral reward was given, with your account ID removed, after you delete your account.</li>
        <li><strong>Payment records:</strong> Stripe and Apple keep payment records for as long as the law requires (in the UK, usually 6 years).</li>
        <li><strong>Website analytics:</strong> kept in Google Analytics for no more than 14 months.</li>
      </ul>

      <H2 id="delete-account">Deleting your account</H2>
      <p><strong>In the iPhone app:</strong> go to Settings, then Account, then Delete account. Your account and your ShiftWell data are deleted straight away.</p>
      <p><strong>By email:</strong> email <Mail /> from the address on your account and we&apos;ll delete it for you within one month (usually much sooner). This is also how to delete an account you only use on the website.</p>
      <ul>
        <li>Deleting your account doesn&apos;t cancel an App Store subscription. Cancel it in your iPhone&apos;s Settings: tap your name, then Subscriptions.</li>
        <li>If you subscribed on the website and the subscription is still active, we&apos;ll ask you to email us so we can cancel it first.</li>
        <li>If you use the same login for another app run by {COMPANY.name}, we keep the login for that app and delete only your ShiftWell data.</li>
        <li>Your Apple Health data stays in Apple Health. ShiftWell only read it.</li>
      </ul>

      <H2>Your rights</H2>
      <p>Under UK data protection law you have the right to:</p>
      <ul>
        <li>get a copy of the data we hold about you;</li>
        <li>have it corrected if it&apos;s wrong;</li>
        <li>have it deleted;</li>
        <li>ask us to limit how we use it;</li>
        <li>get it in a format you can take elsewhere;</li>
        <li>object to us using it on the basis of legitimate interests;</li>
        <li>withdraw your consent at any time (for Apple Health, in the Health app; for AI, in the app&apos;s Settings), without affecting what we did before.</li>
      </ul>
      <p>To use any of these, email <Mail />. We&apos;ll reply within one month.</p>
      <p>
        If you&apos;re unhappy with how we handle your data, please tell us first so we can put it right. You also have the right to complain to the
        Information Commissioner&apos;s Office (ICO), the UK data protection regulator: <A href="https://ico.org.uk/make-a-complaint/">ico.org.uk/make-a-complaint</A> or 0303 123 1113.
      </p>

      <H2>Children</H2>
      <p>ShiftWell is not for anyone under 16. We don&apos;t knowingly collect data from children under 16. If you think a child has given us their data, email <Mail /> and we&apos;ll delete it.</p>

      <H2>Keeping your data safe</H2>
      <p>
        Data is encrypted in transit. Each account can only read and change its own data, and our database enforces this on every request.
        The one exception is Community posts, which are meant to be seen by other ShiftWell users.
        Only a small number of server functions can act across accounts (for example to process payments or delete an account), and they never send your data anywhere except as described above.
      </p>

      <H2>ShiftWell is not medical advice</H2>
      <p>ShiftWell gives general wellbeing guidance for shift workers. It doesn&apos;t diagnose or treat anything, and AI can get things wrong. See our <A href="/terms">Terms</A>.</p>

      <H2>Changes to this policy</H2>
      <p>If we change this policy, we&apos;ll update the date at the top. If a change affects how we use your data in a significant way, we&apos;ll tell you by email or in the app before it takes effect.</p>

      <H2>Contact</H2>
      <p>{COMPANY.name}, {COMPANY.office}. Email <Mail />.</p>
    </LegalLayout>
  )
}
