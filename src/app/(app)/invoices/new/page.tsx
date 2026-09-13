import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { calculateInvoiceTotal, type LineItem } from '@/lib/invoices/calculate'
import { LineItemsEditor } from '../_components/line-items-editor'
import { redirect } from 'next/navigation'

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

async function createInvoice(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const lineItems = parseLineItems(formData.get('line_items_json') as string)
  const manualAmount = Number(formData.get('amount'))
  // If real line items were entered, they're the source of truth for the
  // total (and what the PDF will show) — otherwise fall back to the
  // plain amount field, same as before line items existed at all.
  const amount = lineItems.length > 0 ? calculateInvoiceTotal(lineItems) : manualAmount

  await supabase.from('invoices').insert({
    user_id: user.id,
    client_id: formData.get('client_id') as string,
    invoice_number: formData.get('invoice_number') as string,
    amount,
    currency: (formData.get('currency') as string) || 'JPY',
    issue_date: (formData.get('issue_date') as string) || null,
    due_date: formData.get('due_date') as string,
    notes: formData.get('notes') as string,
    line_items: lineItems,
  })

  redirect('/invoices')
}

export default async function NewInvoicePage() {
  const dict = getDictionary(await getLocale())
  const f = dict.invoices.form
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, name').order('name')

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-xl font-medium">{dict.invoices.newInvoice}</h1>
      {!clients?.length ? (
        <p className="text-sm text-ink/60">
          {f.noClients}{' '}
          <a href="/clients/new" className="text-ledger underline">
            {f.noClientsLink}
          </a>
          .
        </p>
      ) : (
        <form action={createInvoice} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-ink/60">{f.client}</label>
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
            <label className="mb-1 block text-sm text-ink/60">{f.invoiceNumber}</label>
            <input
              name="invoice_number"
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
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm text-ink/60">{f.dueDate}</label>
              <input
                name="due_date"
                type="date"
                required
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="mb-2 text-sm font-medium text-ink/80">{f.lineItemsTitle}</p>
            <LineItemsEditor initialItems={[]} dict={dict.invoices.lineItems} />
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
                className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-sm text-ink/60">{f.currency}</label>
              <select
                name="currency"
                defaultValue="JPY"
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
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
          <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
            {f.saveInvoice}
          </button>
        </form>
      )}
    </div>
  )
}
