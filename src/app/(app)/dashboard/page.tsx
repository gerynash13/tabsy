import { createClient } from '@/lib/supabase/server'
import { todayInJST, daysBetween } from '@/lib/reminders/dates'
import Link from 'next/link'

type Row = {
  id: string
  invoice_number: string
  amount: number
  currency: string
  due_date: string
  status: 'unpaid' | 'overdue' | 'paid'
  clients: { name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, due_date, status, clients(name)')
    .neq('status', 'paid')
    .order('due_date')
    .returns<Row[]>()

  const rows = data ?? []
  const today = todayInJST()

  const totalOutstanding = rows.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const overdue = rows.filter((inv) => inv.status === 'overdue')
  const dueSoon = rows.filter((inv) => inv.status === 'unpaid' && daysBetween(inv.due_date, today) <= 7)

  return (
    <div>
      <h1 className="mb-6 text-xl font-medium">Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-xs text-ink/50">Outstanding</p>
          {/* Naive sum — assumes a single currency for now, per the
              deferred multi-currency item in the project brief. */}
          <p className="mt-1 text-2xl font-medium text-ledger">
            {rows[0]?.currency ?? 'JPY'} {totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-xs text-ink/50">Due soon (7 days)</p>
          <p className="mt-1 text-2xl font-medium">{dueSoon.length}</p>
        </div>
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-xs text-ink/50">Overdue</p>
          <p className="mt-1 text-2xl font-medium text-overdue">{overdue.length}</p>
        </div>
      </div>

      <InvoiceSection title="Overdue" rows={overdue} />
      <InvoiceSection title="Due soon" rows={dueSoon} />
    </div>
  )
}

function InvoiceSection({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-ink/70">{title}</h2>
      {!rows.length ? (
        <p className="text-sm text-ink/40">Nothing here.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((inv) => (
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
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
