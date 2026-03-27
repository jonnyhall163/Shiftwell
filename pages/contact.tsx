export default function Contact() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh' }}>
      <a href="/" style={{ color: '#2dd4bf', textDecoration: 'none', fontSize: 14 }}>← Back to ShiftWell</a>

      <h1 style={{ color: '#2dd4bf', marginTop: 24, marginBottom: 8 }}>Contact Us</h1>
      <p style={{ color: '#94a3b8', marginBottom: 48 }}>We're a small team — we read every message and reply as fast as we can.</p>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ color: '#f59e0b', marginTop: 0 }}>General enquiries</h2>
        <p>For anything about the app, your account, or feedback:</p>
        <a href="mailto:hello@getshiftwell.com" style={{ color: '#2dd4bf', fontSize: 18, fontWeight: 'bold' }}>hello@getshiftwell.com</a>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ color: '#f59e0b', marginTop: 0 }}>Billing & subscriptions</h2>
        <p>To manage, change or cancel your subscription, use the Customer Portal:</p>
        <a href="/api/customer-portal" style={{ display: 'inline-block', marginTop: 8, background: '#2dd4bf', color: '#0f172a', padding: '10px 20px', borderRadius: 8, fontWeight: 'bold', textDecoration: 'none' }}>Manage Subscription</a>
        <p style={{ marginTop: 16 }}>Or email us at <a href="mailto:hello@getshiftwell.com" style={{ color: '#2dd4bf' }}>hello@getshiftwell.com</a></p>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ color: '#f59e0b', marginTop: 0 }}>Privacy & data requests</h2>
        <p>To request access to, correction of, or deletion of your data under GDPR:</p>
        <a href="mailto:hello@getshiftwell.com" style={{ color: '#2dd4bf' }}>hello@getshiftwell.com</a>
        <p style={{ marginTop: 8, color: '#94a3b8', fontSize: 14 }}>We respond to all data requests within 30 days.</p>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 32 }}>
        <h2 style={{ color: '#f59e0b', marginTop: 0 }}>Company details</h2>
        <p style={{ margin: '4px 0' }}>Growvia Digital Ltd</p>
        <p style={{ margin: '4px 0' }}>Glasgow, Scotland, UK</p>
        <p style={{ margin: '4px 0' }}>
          <a href="mailto:hello@getshiftwell.com" style={{ color: '#2dd4bf' }}>hello@getshiftwell.com</a>
        </p>
      </div>

      <p style={{ marginTop: 48, color: '#64748b', fontSize: 14 }}>
        <a href="/privacy" style={{ color: '#64748b', marginRight: 16 }}>Privacy Policy</a>
        <a href="/terms" style={{ color: '#64748b' }}>Terms & Conditions</a>
      </p>
    </div>
  )
}
