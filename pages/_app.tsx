import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Script from 'next/script'
import Head from 'next/head'
import ErrorBoundary from '../components/ErrorBoundary'
import {
  SITE_URL, SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION,
  OG_IMAGE, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, OG_IMAGE_ALT,
} from '../lib/seo'

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err)
      })
    }
  }, [])

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2dd4bf" />

        {/* ── Social share defaults ─────────────────────────────────────
            Every page inherits these, so a link shared from anywhere in
            the app renders a proper card. A page can override any of them
            by rendering its own tag with the SAME key — next/head dedupes
            on key, and og:* tags use `property`, which it does NOT dedupe
            automatically, so the keys are load-bearing rather than
            decorative. */}
        <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:title" content={DEFAULT_TITLE} key="og:title" />
        <meta property="og:description" content={DEFAULT_DESCRIPTION} key="og:description" />
        <meta property="og:url" content={SITE_URL} key="og:url" />
        <meta property="og:image" content={OG_IMAGE} key="og:image" />
        <meta property="og:image:width" content={OG_IMAGE_WIDTH} key="og:image:width" />
        <meta property="og:image:height" content={OG_IMAGE_HEIGHT} key="og:image:height" />
        <meta property="og:image:alt" content={OG_IMAGE_ALT} key="og:image:alt" />

        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:title" content={DEFAULT_TITLE} key="twitter:title" />
        <meta name="twitter:description" content={DEFAULT_DESCRIPTION} key="twitter:description" />
        <meta name="twitter:image" content={OG_IMAGE} key="twitter:image" />
        <meta name="twitter:image:alt" content={OG_IMAGE_ALT} key="twitter:image:alt" />
      </Head>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-NP3BRQ4P5T"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-NP3BRQ4P5T');
        `}
      </Script>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  )
}
