import { NextResponse } from 'next/server'

// Sets the UI language cookie and bounces back to the dashboard. Kept as
// a plain GET link (not a form/server action) so the language switcher
// in the nav needs no client-side JavaScript at all.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'ja'

  const response = NextResponse.redirect(`${origin}/dashboard`)
  response.cookies.set('locale', lang, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}
