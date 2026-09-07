import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

async function updateClient(id: string, formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase
    .from('clients')
    .update({
      name: formData.get('name') as string,
      contact_email: formData.get('contact_email') as string,
      preferred_language: formData.get('preferred_language') as string,
    })
    .eq('id', id)
  redirect('/clients')
}

async function deleteClient(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('clients').delete().eq('id', id)
  redirect('/clients')
}

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single()
  if (!client) notFound()

  const updateWithId = updateClient.bind(null, id)
  const deleteWithId = deleteClient.bind(null, id)

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-xl font-medium">Edit client</h1>
      <form action={updateWithId} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink/60">Name</label>
          <input
            name="name"
            defaultValue={client.name}
            required
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">Contact email</label>
          <input
            name="contact_email"
            type="email"
            defaultValue={client.contact_email ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">Reminder language</label>
          <select
            name="preferred_language"
            defaultValue={client.preferred_language}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          >
            <option value="ja">Japanese</option>
            <option value="en">English</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
          Save
        </button>
      </form>
      <form action={deleteWithId} className="mt-4">
        <button type="submit" className="text-sm text-overdue hover:underline">
          Delete client
        </button>
      </form>
    </div>
  )
}
