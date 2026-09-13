import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import Link from 'next/link'
import { redirect } from 'next/navigation'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getLocale()
  const dict = getDictionary(locale)

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <span className="text-lg font-medium tracking-tight text-ledger">tabsy</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/dashboard" className="hover:text-ledger">
              {dict.nav.dashboard}
            </Link>
            <Link href="/invoices" className="hover:text-ledger">
              {dict.nav.invoices}
            </Link>
            <Link href="/clients" className="hover:text-ledger">
              {dict.nav.clients}
            </Link>
            <Link href="/settings" className="hover:text-ledger">
              {dict.nav.settings}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-1 text-xs">
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
          <form action={signOut}>
            <button className="text-sm text-ink/50 hover:text-ink">{dict.nav.signOut}</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
