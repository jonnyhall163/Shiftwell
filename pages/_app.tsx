import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Script from 'next/script'
import Head from 'next/head'
import ErrorBoundary from '../components/ErrorBoundary'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.jpg" />
        <meta name="theme-color" content="#2dd4bf" />
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
