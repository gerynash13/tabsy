import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function sendMagicLink(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  redirect(error ? '/login?error=1' : '/login?sent=1')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-medium tracking-tight text-ledger">tabsy</h1>
      <p className="mb-8 text-sm text-ink/60">Sign in to track your invoices.</p>

      {params.sent ? (
        <p className="rounded-md bg-tabAccent/10 px-4 py-3 text-sm text-ledger">
          Check your email for a sign-in link.
        </p>
      ) : (
        <form action={sendMagicLink} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-ledger"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-ledger px-3 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            Send magic link
          </button>
          {params.error && (
            <p className="text-sm text-overdue">Something went wrong — try again.</p>
          )}
        </form>
      )}
    </main>
  )
}
