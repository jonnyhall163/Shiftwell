import Head from 'next/head'
import Link from 'next/link'
import type { ReactNode } from 'react'

// Shared look for the privacy policy and terms: plain, readable, dark like the
// rest of the site. The iPhone app links to both pages (Settings, Help and
// privacy), so they're written to work on a phone first.

export const LEGAL_UPDATED = '11 November 2026'

export const COMPANY = {
  name: 'Growvia Digital Ltd',
  number: 'SC904142',
  office: 'Unit 9, 8 Cambuslea Road, Ayr KA8 9HT',
  email: 'hello@getshiftwell.com',
}

const linkStyle = { color: '#2dd4bf' }

export function Mail() {
  return <a href={`mailto:${COMPANY.email}`} style={linkStyle}>{COMPANY.email}</a>
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith('http')
  return external
    ? <a href={href} style={linkStyle} target="_blank" rel="noopener noreferrer">{children}</a>
    : <Link href={href} style={linkStyle}>{children}</Link>
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return <h2 id={id} style={{ color: '#f59e0b', fontSize: 20, margin: '36px 0 10px', scrollMarginTop: 16 }}>{children}</h2>
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 style={{ color: '#e2e8f0', fontSize: 16, margin: '20px 0 6px' }}>{children}</h3>
}

export default function LegalLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <>
      <Head>
        <title>{`${title} | ShiftWell`}</title>
        <meta name="description" content={description} />
      </Head>
      <div className="legal" style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 48px', fontFamily: 'sans-serif', color: '#e2e8f0', background: '#0f172a', minHeight: '100vh', lineHeight: 1.65, fontSize: 16 }}>
        <style>{`
          .legal p { margin: 0 0 12px; }
          .legal ul { margin: 0 0 12px; padding-left: 22px; }
          .legal li { margin-bottom: 6px; }
          .legal table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 15px; }
          .legal th, .legal td { text-align: left; vertical-align: top; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .legal th { color: #94a3b8; font-weight: 600; }
          .legal .box { background: #111c33; border: 1px solid rgba(45,212,191,0.25); border-radius: 12px; padding: 14px 16px; margin: 12px 0 16px; }
          @media (max-width: 560px) {
            .legal table, .legal thead, .legal tbody, .legal tr, .legal th, .legal td { display: block; width: 100%; }
            .legal thead { display: none; }
            .legal tr { border-bottom: 1px solid rgba(255,255,255,0.1); padding: 8px 0; }
            .legal td { border: none; padding: 2px 0; }
            .legal td:first-child { font-weight: 700; color: #f3f4f6; }
          }
        `}</style>
        <Link href="/" style={{ color: '#2dd4bf', textDecoration: 'none', fontSize: 14 }}>← Back to ShiftWell</Link>
        <h1 style={{ color: '#2dd4bf', margin: '24px 0 8px', fontSize: 30, lineHeight: 1.2 }}>{title}</h1>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>Last updated: {LEGAL_UPDATED}</p>
        {children}
        <footer style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontSize: 14 }}>
          <p style={{ margin: '0 0 8px' }}>
            <Link href="/privacy" style={{ color: '#94a3b8', marginRight: 16 }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: '#94a3b8', marginRight: 16 }}>Terms</Link>
            <Link href="/contact" style={{ color: '#94a3b8' }}>Contact</Link>
          </p>
          <p style={{ margin: 0 }}>{COMPANY.name}, company {COMPANY.number}, registered in Scotland. {COMPANY.office}. {COMPANY.email}</p>
        </footer>
      </div>
    </>
  )
}
