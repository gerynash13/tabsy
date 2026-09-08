import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Where Supabase's magic link redirects back to. Exchanges the one-time
// code for a real session, then sends the user into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=1`)
}
