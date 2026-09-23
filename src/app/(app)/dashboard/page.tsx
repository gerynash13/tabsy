import { createClient } from '@/lib/supabase/server'
import { todayInJST, daysBetween } from '@/lib/reminders/dates'
import { groupByCurrency } from '@/lib/invoices/currencies'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
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
  const dict = getDictionary(await getLocale())
  const supabase = await createClient()
  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_number, amount, currency, due_date, status, clients(name)')
    .neq('status', 'paid')
    .order('due_date')
    .returns<Row[]>()

  const rows = data ?? []
  const today = todayInJST()

  const totalOutstanding = groupByCurrency(rows)
  const overdue = rows.filter((inv) => inv.status === 'overdue')
  const dueSoon = rows.filter((inv) => inv.status === 'unpaid' && daysBetween(inv.due_date, today) <= 7)

  return (
    <div>
      <h1 className="mb-6 text-xl font-medium">{dict.dashboard.title}</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-xs text-ink/50">{dict.dashboard.outstanding}</p>
          {totalOutstanding.length === 0 ? (
            <p className="mt-1 text-2xl font-medium text-ledger">JPY 0</p>
          ) : (
            <div className="mt-1 space-y-0.5">
              {totalOutstanding.map(({ currency, total }) => (
                <p key={currency} className="text-2xl font-medium text-ledger">
                  {currency} {total.toLocaleString()}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-xs text-ink/50">{dict.dashboard.dueSoonCard}</p>
          <p className="mt-1 text-2xl font-medium">{dueSoon.length}</p>
        </div>
        <div className="rounded-md border border-ink/10 p-4">
          <p className="text-xs text-ink/50">{dict.dashboard.overdueCard}</p>
          <p className="mt-1 text-2xl font-medium text-overdue">{overdue.length}</p>
        </div>
      </div>

      <InvoiceSection title={dict.dashboard.overdueSection} rows={overdue} emptyLabel={dict.dashboard.empty} />
      <InvoiceSection title={dict.dashboard.dueSoonSection} rows={dueSoon} emptyLabel={dict.dashboard.empty} />
    </div>
  )
}

function InvoiceSection({ title, rows, emptyLabel }: { title: string; rows: Row[]; emptyLabel: string }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-ink/70">{title}</h2>
      {!rows.length ? (
        <p className="text-sm text-ink/40">{emptyLabel}</p>
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
