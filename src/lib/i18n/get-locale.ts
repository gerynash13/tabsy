import { cookies } from 'next/headers'

export type Locale = 'en' | 'ja'

// This is the UI language — what language *you* see the app in. It's
// deliberately separate from a client's preferred_language on the
// clients table, which controls what language *they* receive reminder
// emails in. Those two are unrelated settings that happen to share the
// same two values.
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get('locale')?.value
  return value === 'en' ? 'en' : 'ja' // defaults to Japanese, matching the target market
}
