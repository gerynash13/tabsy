import { createClient } from '@/lib/supabase/server'
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

// Status is now genuinely stored and kept current by the daily cron job
// (see Week 3's update to the cron route) — no more computing "overdue"
// on the fly here. One small caveat worth knowing: since the cron only
// runs once a day, a due date that just passed today may still show as
// "unpaid" until the next run.
function StatusBadge({ status }: { status: InvoiceRow['status'] }) {
  const styles =
    status === 'paid'
      ? 'bg-tabAccent/10 text-tabAccent'
      : status === 'overdue'
        ? 'bg-overdue/10 text-overdue'
        : 'bg-ink/5 text-ink/60'
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>{status}</span>
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, due_date, status, clients(name)')
    .order('due_date', { ascending: true })
    .returns<InvoiceRow[]>()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Invoices</h1>
        <Link href="/invoices/new" className="rounded-md bg-ledger px-3 py-1.5 text-sm text-paper">
          New invoice
        </Link>
      </div>

      {!invoices?.length ? (
        <p className="text-sm text-ink/50">No invoices yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="py-2 font-normal">Invoice</th>
              <th className="py-2 font-normal">Client</th>
              <th className="py-2 font-normal">Amount</th>
              <th className="py-2 font-normal">Due</th>
              <th className="py-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
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
                  <StatusBadge status={inv.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
