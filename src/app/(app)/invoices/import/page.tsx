import { ImportForm } from './import-form'

export default function ImportInvoicesPage() {
  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-xl font-medium">Import invoices from CSV</h1>
      <p className="mb-6 text-sm text-ink/60">
        Clients are matched by email (or name, if no email column) and created automatically if
        they don't exist yet.
      </p>

      <div className="mb-6 rounded-md border border-ink/10 p-4 text-sm">
        <p className="mb-2 font-medium text-ink/80">Expected columns</p>
        <code className="block overflow-x-auto whitespace-pre text-xs text-ink/60">
          client_name,client_email,invoice_number,amount,currency,due_date,notes
        </code>
        <p className="mt-2 text-xs text-ink/50">
          Only client_name, invoice_number, amount, and due_date are required. due_date accepts
          YYYY-MM-DD or YYYY/MM/DD. currency defaults to JPY if left blank.
        </p>
      </div>

      <ImportForm />
    </div>
  )
}
