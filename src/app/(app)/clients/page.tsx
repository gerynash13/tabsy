import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, contact_email, preferred_language')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Clients</h1>
        <Link href="/clients/new" className="rounded-md bg-ledger px-3 py-1.5 text-sm text-paper">
          New client
        </Link>
      </div>

      {!clients?.length ? (
        <p className="text-sm text-ink/50">No clients yet.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="py-2 font-normal">Name</th>
              <th className="py-2 font-normal">Email</th>
              <th className="py-2 font-normal">Language</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-ink/5">
                <td className="py-2">
                  <Link href={`/clients/${c.id}`} className="hover:text-ledger">
                    {c.name}
                  </Link>
                </td>
                <td className="py-2 text-ink/70">{c.contact_email}</td>
                <td className="py-2 text-ink/70">{c.preferred_language}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
