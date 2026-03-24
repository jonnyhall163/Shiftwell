import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Script from 'next/script'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
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
      <Component {...pageProps} />
    </>
  )
}
