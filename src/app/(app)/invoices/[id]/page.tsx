import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { calculateInvoiceTotal, type LineItem } from '@/lib/invoices/calculate'
import { SUPPORTED_CURRENCIES } from '@/lib/invoices/currencies'
import { createInvoicePaymentLink, deactivatePaymentLink } from '@/lib/stripe/payment-link'
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
  const currency = formData.get('currency') as string

  const updates: Record<string, unknown> = {
    client_id: formData.get('client_id') as string,
    invoice_number: formData.get('invoice_number') as string,
    amount,
    currency,
    issue_date: (formData.get('issue_date') as string) || null,
    due_date: formData.get('due_date') as string,
    notes: formData.get('notes') as string,
    line_items: lineItems,
  }

  // A Payment Link is created for a fixed amount+currency. If either
  // changed, the existing link would charge the wrong thing — deactivate
  // it and clear it out so the invoice shows no link until the user
  // explicitly generates a fresh one for the new amount.
  const { data: existing } = await supabase
    .from('invoices')
    .select('amount, currency, stripe_payment_link_id')
    .eq('id', id)
    .single()

  if (existing?.stripe_payment_link_id && (Number(existing.amount) !== amount || existing.currency !== currency)) {
    await deactivatePaymentLink(existing.stripe_payment_link_id)
    updates.stripe_payment_link_id = null
    updates.stripe_payment_link_url = null
  }

  await supabase.from('invoices').update(updates).eq('id', id)
  redirect('/invoices')
}

async function markPaid(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: invoice } = await supabase.from('invoices').select('stripe_payment_link_id').eq('id', id).single()
  if (invoice?.stripe_payment_link_id) {
    await deactivatePaymentLink(invoice.stripe_payment_link_id)
  }
  await supabase.from('invoices').update({ status: 'paid' }).eq('id', id)
  redirect('/invoices')
}

async function deleteInvoice(id: string) {
  'use server'
  const supabase = await createClient()
  const { data: invoice } = await supabase.from('invoices').select('stripe_payment_link_id').eq('id', id).single()
  if (invoice?.stripe_payment_link_id) {
    await deactivatePaymentLink(invoice.stripe_payment_link_id)
  }
  await supabase.from('invoices').delete().eq('id', id)
  redirect('/invoices')
}

async function createPaymentLink(id: string) {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single()
  if (!invoice) redirect('/invoices')

  const { data: profile } = await supabase.from('profiles').select('business_name').eq('id', user.id).single()

  const link = await createInvoicePaymentLink({
    invoiceId: id,
    invoiceNumber: invoice.invoice_number,
    amount: invoice.amount,
    currency: invoice.currency,
    businessName: profile?.business_name || 'Tabsy',
  })

  await supabase
    .from('invoices')
    .update({ stripe_payment_link_id: link.id, stripe_payment_link_url: link.url })
    .eq('id', id)

  redirect(`/invoices/${id}`)
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
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY)
  const updateWithId = updateInvoice.bind(null, id)
  const markPaidWithId = markPaid.bind(null, id)
  const deleteWithId = deleteInvoice.bind(null, id)
  const createPaymentLinkWithId = createPaymentLink.bind(null, id)

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

      {invoice.status !== 'paid' && stripeConfigured && (
        <div className="mb-4 rounded-md border border-ink/10 p-4">
          <p className="mb-2 text-sm font-medium text-ink/80">{f.paymentLinkTitle}</p>
          {invoice.stripe_payment_link_url ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                readOnly
                value={invoice.stripe_payment_link_url}
                className="min-w-[200px] flex-1 rounded-md border border-ink/15 bg-ink/5 px-3 py-2 text-xs text-ink/70"
              />
              <a
                href={invoice.stripe_payment_link_url}
                target="_blank"
                className="whitespace-nowrap text-sm text-ledger hover:underline"
              >
                {f.openLink}
              </a>
            </div>
          ) : (
            <form action={createPaymentLinkWithId}>
              <button type="submit" className="rounded-md border border-ink/15 px-3 py-1.5 text-sm text-ink/70">
                {f.createPaymentLink}
              </button>
            </form>
          )}
        </div>
      )}
      {invoice.status !== 'paid' && !stripeConfigured && (
        <p className="mb-4 text-xs text-ink/40">{f.stripeNotConfigured}</p>
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
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {!(SUPPORTED_CURRENCIES as readonly string[]).includes(invoice.currency) && (
                <option value={invoice.currency}>{invoice.currency}</option>
              )}
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
