import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { redirect } from 'next/navigation'

async function createClientRecord(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('clients').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    company_name: (formData.get('company_name') as string) || null,
    contact_email: (formData.get('contact_email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    notes: (formData.get('notes') as string) || null,
    preferred_language: formData.get('preferred_language') as string,
  })

  redirect('/clients')
}

export default async function NewClientPage() {
  const dict = getDictionary(await getLocale())
  const f = dict.clients.form

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-xl font-medium">{dict.clients.newClient}</h1>
      <form action={createClientRecord} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink/60">{f.contactPerson}</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">{f.companyName}</label>
          <input
            name="company_name"
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">{f.contactEmail}</label>
          <input
            name="contact_email"
            type="email"
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">{f.phone}</label>
          <input
            name="phone"
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">{f.reminderLanguage}</label>
          <select
            name="preferred_language"
            defaultValue="ja"
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          >
            <option value="ja">{f.japanese}</option>
            <option value="en">{f.english}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">{f.notes}</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
          {f.saveClient}
        </button>
      </form>
    </div>
  )
}
