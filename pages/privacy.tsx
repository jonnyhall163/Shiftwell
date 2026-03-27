export default function Privacy() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' }}>
      <a href="/" style={{ color: '#2dd4bf', textDecoration: 'none', fontSize: 14 }}>← Back to ShiftWell</a>

      <h1 style={{ color: '#2dd4bf', marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#94a3b8', marginBottom: 32 }}>Last updated: March 2026</p>

      <h2 style={{ color: '#f59e0b' }}>Who we are</h2>
      <p>ShiftWell is operated by Growvia Digital Ltd. If you have any questions about this policy, contact us at <a href="mailto:hello@getshiftwell.com" style={{ color: '#2dd4bf' }}>hello@getshiftwell.com</a>.</p>

      <h2 style={{ color: '#f59e0b' }}>What data we collect</h2>
      <ul>
        <li>Email address and account credentials</li>
        <li>Shift pattern and schedule information</li>
        <li>Sleep logs and hydration data</li>
        <li>Food timing entries</li>
        <li>Life context you provide (e.g. children, school runs)</li>
        <li>Payment information (processed securely by Stripe — we never store card details)</li>
        <li>Usage data via Google Analytics (anonymised)</li>
      </ul>

      <h2 style={{ color: '#f59e0b' }}>Why we collect it</h2>
      <ul>
        <li>To provide personalised shift-aware wellness guidance</li>
        <li>To process your subscription payment</li>
        <li>To improve the app based on how it's used</li>
        <li>To contact you about your account if needed</li>
      </ul>

      <h2 style={{ color: '#f59e0b' }}>Who we share it with</h2>
      <p>We use the following third-party services to operate ShiftWell:</p>
      <ul>
        <li><strong>Supabase</strong> — secure database storage</li>
        <li><strong>Stripe</strong> — payment processing</li>
        <li><strong>Anthropic</strong> — AI-powered guidance and companion chat</li>
        <li><strong>Vercel</strong> — app hosting</li>
        <li><strong>Google Analytics</strong> — anonymised usage analytics</li>
      </ul>
      <p>We never sell your data. Ever.</p>

      <h2 style={{ color: '#f59e0b' }}>Your rights (GDPR)</h2>
      <p>As a UK/EU user you have the right to:</p>
      <ul>
        <li>Access the data we hold about you</li>
        <li>Request correction or deletion of your data</li>
        <li>Export your data</li>
        <li>Withdraw consent at any time</li>
      </ul>
      <p>To exercise any of these rights, email <a href="mailto:hello@getshiftwell.com" style={{ color: '#2dd4bf' }}>hello@getshiftwell.com</a>.</p>

      <h2 style={{ color: '#f59e0b' }}>Data retention</h2>
      <p>We retain your data for as long as your account is active. If you delete your account, your personal data is removed within 30 days.</p>

      <h2 style={{ color: '#f59e0b' }}>Cookies</h2>
      <p>We use essential cookies to keep you logged in, and analytics cookies via Google Analytics. You can disable analytics cookies in your browser settings.</p>

      <h2 style={{ color: '#f59e0b' }}>Changes to this policy</h2>
      <p>We may update this policy occasionally. We'll notify you by email if any significant changes are made.</p>

      <p style={{ marginTop: 48, color: '#64748b', fontSize: 14 }}>Growvia Digital Ltd · hello@getshiftwell.com</p>
    </div>
  )
}
