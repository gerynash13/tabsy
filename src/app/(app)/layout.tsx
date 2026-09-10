import { createClient } from '@/lib/supabase/server'
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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <span className="text-lg font-medium tracking-tight text-ledger">tabsy</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/dashboard" className="hover:text-ledger">
              Dashboard
            </Link>
            <Link href="/invoices" className="hover:text-ledger">
              Invoices
            </Link>
            <Link href="/clients" className="hover:text-ledger">
              Clients
            </Link>
            <Link href="/settings" className="hover:text-ledger">
              Settings
            </Link>
          </nav>
        </div>
        <form action={signOut}>
          <button className="text-sm text-ink/50 hover:text-ink">Sign out</button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
