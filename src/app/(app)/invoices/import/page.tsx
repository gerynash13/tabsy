import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { ImportForm } from './import-form'

export default async function ImportInvoicesPage() {
  const dict = getDictionary(await getLocale())
  const t = dict.invoices.import

  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-xl font-medium">{t.title}</h1>
      <p className="mb-6 text-sm text-ink/60">{t.description}</p>

      <div className="mb-6 rounded-md border border-ink/10 p-4 text-sm">
        <p className="mb-2 font-medium text-ink/80">{t.expectedColumns}</p>
        <code className="block overflow-x-auto whitespace-pre text-xs text-ink/60">
          client_name,client_email,invoice_number,amount,currency,due_date,notes
        </code>
        <p className="mt-2 text-xs text-ink/50">{t.helper}</p>
      </div>

      <ImportForm dict={t} />
    </div>
  )
}
