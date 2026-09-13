import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import Link from 'next/link'

export default async function ClientsPage() {
  const dict = getDictionary(await getLocale())
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name, contact_email, preferred_language')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">{dict.clients.title}</h1>
        <Link href="/clients/new" className="rounded-md bg-ledger px-3 py-1.5 text-sm text-paper">
          {dict.clients.newClient}
        </Link>
      </div>

      {!clients?.length ? (
        <p className="text-sm text-ink/50">{dict.clients.empty}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="py-2 font-normal">{dict.clients.colContact}</th>
              <th className="py-2 font-normal">{dict.clients.colCompany}</th>
              <th className="py-2 font-normal">{dict.clients.colEmail}</th>
              <th className="py-2 font-normal">{dict.clients.colLanguage}</th>
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
                <td className="py-2 text-ink/70">{c.company_name}</td>
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
