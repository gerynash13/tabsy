import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function createInvoice(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('invoices').insert({
    user_id: user.id,
    client_id: formData.get('client_id') as string,
    invoice_number: formData.get('invoice_number') as string,
    amount: Number(formData.get('amount')),
    currency: (formData.get('currency') as string) || 'JPY',
    due_date: formData.get('due_date') as string,
    notes: formData.get('notes') as string,
  })

  redirect('/invoices')
}

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-xl font-medium">New invoice</h1>
      {!clients?.length ? (
        <p className="text-sm text-ink/60">
          Add a client first —{' '}
          <a href="/clients/new" className="text-ledger underline">
            create one here
          </a>
          .
        </p>
      ) : (
        <form action={createInvoice} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-ink/60">Client</label>
            <select
              name="client_id"
              required
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">Invoice number</label>
            <input
              name="invoice_number"
              required
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-ink/60">Amount</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-sm text-ink/60">Currency</label>
              <input
                name="currency"
                defaultValue="JPY"
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">Due date</label>
            <input
              name="due_date"
              type="date"
              required
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-ink/60">Notes</label>
            <textarea
              name="notes"
              rows={3}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
          <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
            Save invoice
          </button>
        </form>
      )}
    </div>
  )
}
