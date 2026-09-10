'use client'

import { useActionState } from 'react'
import { importCsvAction, type ImportState } from './actions'

const initialState: ImportState = { success: 0, errors: [] }

export function ImportForm() {
  const [state, formAction, isPending] = useActionState(importCsvAction, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="file"
        name="file"
        accept=".csv"
        required
        className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-ledger px-4 py-2 text-sm text-paper disabled:opacity-50"
      >
        {isPending ? 'Importing…' : 'Import'}
      </button>

      {state.success > 0 && (
        <p className="rounded-md bg-tabAccent/10 px-4 py-2 text-sm text-ledger">
          Imported {state.success} invoice{state.success === 1 ? '' : 's'}.
        </p>
      )}

      {state.errors.length > 0 && (
        <div className="rounded-md bg-overdue/10 px-4 py-3 text-sm text-overdue">
          <p className="mb-1 font-medium">{state.errors.length} row(s) skipped:</p>
          <ul className="list-inside list-disc space-y-0.5">
            {state.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}
