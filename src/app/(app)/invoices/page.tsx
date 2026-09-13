import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import Link from 'next/link'

type InvoiceRow = {
  id: string
  invoice_number: string
  amount: number
  currency: string
  due_date: string
  status: 'unpaid' | 'overdue' | 'paid'
  clients: { name: string } | null
}

export default async function InvoicesPage() {
  const dict = getDictionary(await getLocale())
  const statusLabels = {
    unpaid: dict.invoices.statusUnpaid,
    overdue: dict.invoices.statusOverdue,
    paid: dict.invoices.statusPaid,
  }

  const supabase = await createClient()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, due_date, status, clients(name)')
    .order('due_date', { ascending: true })
    .returns<InvoiceRow[]>()

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-medium">{dict.invoices.title}</h1>
        <div className="flex gap-2">
          <Link href="/invoices/import" className="rounded-md border border-ink/15 px-3 py-1.5 text-sm text-ink/70">
            {dict.invoices.importCsv}
          </Link>
          <Link href="/invoices/new" className="rounded-md bg-ledger px-3 py-1.5 text-sm text-paper">
            {dict.invoices.newInvoice}
          </Link>
        </div>
      </div>

      {!invoices?.length ? (
        <p className="text-sm text-ink/50">{dict.invoices.empty}</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="py-2 font-normal">{dict.invoices.colInvoice}</th>
              <th className="py-2 font-normal">{dict.invoices.colClient}</th>
              <th className="py-2 font-normal">{dict.invoices.colAmount}</th>
              <th className="py-2 font-normal">{dict.invoices.colDue}</th>
              <th className="py-2 font-normal">{dict.invoices.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const styles =
                inv.status === 'paid'
                  ? 'bg-tabAccent/10 text-tabAccent'
                  : inv.status === 'overdue'
                    ? 'bg-overdue/10 text-overdue'
                    : 'bg-ink/5 text-ink/60'
              return (
                <tr key={inv.id} className="border-b border-ink/5">
                  <td className="py-2">
                    <Link href={`/invoices/${inv.id}`} className="hover:text-ledger">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="py-2 text-ink/70">{inv.clients?.name}</td>
                  <td className="py-2 text-ink/70">
                    {inv.currency} {Number(inv.amount).toLocaleString()}
                  </td>
                  <td className="py-2 text-ink/70">{inv.due_date}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
                      {statusLabels[inv.status]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
