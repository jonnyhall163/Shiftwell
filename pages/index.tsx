import { useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>ShiftWell — Built for Shift Workers</title>
        <meta name="description" content="The first wellness app that wraps sleep, hydration and daily coaching around your actual shift pattern." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <iframe
        src="/landing.html"
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
      />
    </>
  )
}
