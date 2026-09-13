import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
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
  const locale = await getLocale()
  const dict = getDictionary(locale)

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-medium tracking-tight text-ledger">tabsy</h1>
          <p className="text-sm text-ink/60">{dict.login.subtitle}</p>
        </div>
        <div className="flex gap-1 pt-1 text-xs">
          <a
            href="/api/locale?lang=ja"
            className={`rounded px-1.5 py-0.5 ${locale === 'ja' ? 'bg-ink/10 text-ink' : 'text-ink/40 hover:text-ink'}`}
          >
            日本語
          </a>
          <span className="text-ink/20">/</span>
          <a
            href="/api/locale?lang=en"
            className={`rounded px-1.5 py-0.5 ${locale === 'en' ? 'bg-ink/10 text-ink' : 'text-ink/40 hover:text-ink'}`}
          >
            EN
          </a>
        </div>
      </div>

      {params.sent ? (
        <p className="rounded-md bg-tabAccent/10 px-4 py-3 text-sm text-ledger">{dict.login.checkEmail}</p>
      ) : (
        <form action={sendMagicLink} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder={dict.login.emailPlaceholder}
            className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-ledger"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-ledger px-3 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            {dict.login.sendButton}
          </button>
          {params.error && <p className="text-sm text-overdue">{dict.login.error}</p>}
        </form>
      )}
    </main>
  )
}
