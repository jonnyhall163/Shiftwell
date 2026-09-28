// iPhone detection from the user agent, for iPhone-only prompts (the launch
// list). iPod counts too; iPad doesn't (the first release is the iPhone app).
export function isIPhoneUserAgent(ua: string | undefined | null): boolean {
  return !!ua && /iPhone|iPod/i.test(ua)
}

// Android phones and tablets, for the Android card on /iphone.
export function isAndroidUserAgent(ua: string | undefined | null): boolean {
  return !!ua && /Android/i.test(ua)
}
