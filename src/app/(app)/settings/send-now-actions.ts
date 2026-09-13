'use server'

import { runReminderSweep } from '@/lib/reminders/run-sweep'

export type SendNowState = { checked: number; sent: number; errors: string[] } | null

export async function sendNowAction(): Promise<SendNowState> {
  const result = await runReminderSweep()
  const sent = result.results.filter((r) => r.sent).length
  const errors = result.results.filter((r) => r.error).map((r) => `Invoice ${r.invoiceId} (offset ${r.offset}): ${r.error}`)
  return { checked: result.checked, sent, errors }
}
