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
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="text-lg font-medium tracking-tight text-ledger">tabsy</span>
          <nav className="flex gap-5 text-sm">
            <Link href="/invoices" className="hover:text-ledger">
              Invoices
            </Link>
            <Link href="/clients" className="hover:text-ledger">
              Clients
            </Link>
          </nav>
        </div>
        <form action={signOut}>
          <button className="text-sm text-ink/50 hover:text-ink">Sign out</button>
        </form>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  )
}
