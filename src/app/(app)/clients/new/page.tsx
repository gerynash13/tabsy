import { createClient } from '@/lib/supabase/server'
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
    contact_email: formData.get('contact_email') as string,
    preferred_language: formData.get('preferred_language') as string,
  })

  redirect('/clients')
}

export default function NewClientPage() {
  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-xl font-medium">New client</h1>
      <form action={createClientRecord} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink/60">Name</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">Contact email</label>
          <input
            name="contact_email"
            type="email"
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">Reminder language</label>
          <select
            name="preferred_language"
            defaultValue="ja"
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          >
            <option value="ja">Japanese</option>
            <option value="en">English</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
          Save client
        </button>
      </form>
    </div>
  )
}
