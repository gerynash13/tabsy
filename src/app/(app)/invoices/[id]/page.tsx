import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

async function updateInvoice(id: string, formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase
    .from('invoices')
    .update({
      client_id: formData.get('client_id') as string,
      invoice_number: formData.get('invoice_number') as string,
      amount: Number(formData.get('amount')),
      currency: formData.get('currency') as string,
      due_date: formData.get('due_date') as string,
      notes: formData.get('notes') as string,
    })
    .eq('id', id)
  redirect('/invoices')
}

async function markPaid(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('invoices').update({ status: 'paid' }).eq('id', id)
  redirect('/invoices')
}

async function deleteInvoice(id: string) {
  'use server'
  const supabase = await createClient()
  await supabase.from('invoices').delete().eq('id', id)
  redirect('/invoices')
}

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: invoice }, { data: clients }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, name').order('name'),
  ])
  if (!invoice) notFound()

  const updateWithId = updateInvoice.bind(null, id)
  const markPaidWithId = markPaid.bind(null, id)
  const deleteWithId = deleteInvoice.bind(null, id)

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Edit invoice</h1>
        {invoice.status !== 'paid' && (
          <form action={markPaidWithId}>
            <button
              type="submit"
              className="rounded-full bg-tabAccent/10 px-3 py-1 text-xs font-medium text-tabAccent"
            >
              Mark as paid
            </button>
          </form>
        )}
      </div>

      <form action={updateWithId} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink/60">Client</label>
          <select
            name="client_id"
            defaultValue={invoice.client_id}
            required
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          >
            {clients?.map((c) => (
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
            defaultValue={invoice.invoice_number}
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
              defaultValue={invoice.amount}
              required
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-sm text-ink/60">Currency</label>
            <input
              name="currency"
              defaultValue={invoice.currency}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">Due date</label>
          <input
            name="due_date"
            type="date"
            defaultValue={invoice.due_date}
            required
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">Notes</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={invoice.notes ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
          Save changes
        </button>
      </form>
      <form action={deleteWithId} className="mt-4">
        <button type="submit" className="text-sm text-overdue hover:underline">
          Delete invoice
        </button>
      </form>
    </div>
  )
}
