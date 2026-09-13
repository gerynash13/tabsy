import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { calculateInvoiceTotal, type LineItem } from '@/lib/invoices/calculate'
import { LineItemsEditor } from '../_components/line-items-editor'
import { redirect, notFound } from 'next/navigation'

function parseLineItems(raw: string | null): LineItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((i) => i && typeof i.description === 'string' && i.description.trim())
      .map((i) => ({
        description: String(i.description),
        quantity: Number(i.quantity) || 0,
        unit_price: Number(i.unit_price) || 0,
        tax_rate: Number(i.tax_rate) === 0.08 ? 0.08 : 0.1,
      }))
  } catch {
    return []
  }
}

async function updateInvoice(id: string, formData: FormData) {
  'use server'
  const supabase = await createClient()
  const lineItems = parseLineItems(formData.get('line_items_json') as string)
  const manualAmount = Number(formData.get('amount'))
  const amount = lineItems.length > 0 ? calculateInvoiceTotal(lineItems) : manualAmount

  await supabase
    .from('invoices')
    .update({
      client_id: formData.get('client_id') as string,
      invoice_number: formData.get('invoice_number') as string,
      amount,
      currency: formData.get('currency') as string,
      issue_date: (formData.get('issue_date') as string) || null,
      due_date: formData.get('due_date') as string,
      notes: formData.get('notes') as string,
      line_items: lineItems,
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
  const dict = getDictionary(await getLocale())
  const f = dict.invoices.form
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: invoice }, { data: clients }, { data: profile }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('profiles').select('invoice_registration_number').eq('id', user.id).single(),
  ])
  if (!invoice) notFound()

  const lineItems = (invoice.line_items as LineItem[]) ?? []
  const updateWithId = updateInvoice.bind(null, id)
  const markPaidWithId = markPaid.bind(null, id)
  const deleteWithId = deleteInvoice.bind(null, id)

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">{dict.invoices.title}</h1>
        <div className="flex items-center gap-3">
          {lineItems.length > 0 && (
            <a href={`/api/invoices/${id}/pdf`} target="_blank" className="text-sm text-ledger hover:underline">
              {f.downloadPdf}
            </a>
          )}
          {invoice.status !== 'paid' && (
            <form action={markPaidWithId}>
              <button
                type="submit"
                className="rounded-full bg-tabAccent/10 px-3 py-1 text-xs font-medium text-tabAccent"
              >
                {f.markAsPaid}
              </button>
            </form>
          )}
        </div>
      </div>

      {lineItems.length > 0 && !profile?.invoice_registration_number && (
        <p className="mb-4 rounded-md bg-overdue/10 px-4 py-2 text-xs text-overdue">{f.noRegistrationWarning}</p>
      )}

      <form action={updateWithId} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink/60">{f.client}</label>
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
          <label className="mb-1 block text-sm text-ink/60">{f.invoiceNumber}</label>
          <input
            name="invoice_number"
            defaultValue={invoice.invoice_number}
            required
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">{f.issueDate}</label>
            <input
              name="issue_date"
              type="date"
              defaultValue={invoice.issue_date ?? ''}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">{f.dueDate}</label>
            <input
              name="due_date"
              type="date"
              defaultValue={invoice.due_date}
              required
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
        </div>

        <div className="pt-2">
          <p className="mb-2 text-sm font-medium text-ink/80">{f.lineItemsTitle}</p>
          <LineItemsEditor initialItems={lineItems} dict={dict.invoices.lineItems} />
        </div>

        <div className="flex gap-3 pt-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">
              {f.amount} <span className="text-xs text-ink/40">(used only if no line items above)</span>
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={invoice.amount}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-sm text-ink/60">{f.currency}</label>
            <select
              name="currency"
              defaultValue={invoice.currency}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            >
              <option value="JPY">JPY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
              <option value="CNY">CNY</option>
              <option value="KRW">KRW</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">{f.notes}</label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={invoice.notes ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
          {f.saveChanges}
        </button>
      </form>
      <form action={deleteWithId} className="mt-4">
        <button type="submit" className="text-sm text-overdue hover:underline">
          {f.deleteInvoice}
        </button>
      </form>
    </div>
  )
}
