import { createAdminClient } from '@/lib/supabase/admin'
import { todayInJST, addDays } from './dates'
import { getTemplate, formatAmount, bankSection } from './templates'
import { interpolate } from './render'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.REMINDER_FROM_EMAIL || 'Tabsy <onboarding@resend.dev>'

export type SweepResult = {
  today: string
  checked: number
  results: { invoiceId: string; offset: number; sent: boolean; error?: string }[]
}

// The actual reminder engine. Called by the daily cron route, and also
// available for a manual "send reminders now" trigger — both need to run
// exactly the same logic, so this is the one place it lives.
export async function runReminderSweep(): Promise<SweepResult> {
  const supabase = createAdminClient()
  const today = todayInJST()

  await supabase.from('invoices').update({ status: 'overdue' }).eq('status', 'unpaid').lt('due_date', today)

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, amount, currency, due_date, status, clients(name, contact_email, preferred_language), profiles(id, business_name, bank_details, reminder_offsets)'
    )
    .neq('status', 'paid')

  if (error) {
    throw new Error(error.message)
  }

  const results: SweepResult['results'] = []

  for (const inv of invoices ?? []) {
    const client = inv.clients as any
    const profile = inv.profiles as any
    if (!client?.contact_email || !profile) continue

    for (const offset of (profile.reminder_offsets as number[]) ?? []) {
      const targetDate = addDays(inv.due_date, offset)
      if (targetDate !== today) continue

      const { error: claimError } = await supabase
        .from('reminder_log')
        .insert({ invoice_id: inv.id, offset_days: offset })

      if (claimError) {
        results.push({ invoiceId: inv.id, offset, sent: false })
        continue
      }

      const lang: 'ja' | 'en' = client.preferred_language === 'en' ? 'en' : 'ja'

      const { data: custom } = await supabase
        .from('email_templates')
        .select('subject, body')
        .eq('user_id', profile.id)
        .eq('language', lang)
        .eq('stage_offset', offset)
        .maybeSingle()

      let subject: string
      let body: string

      if (custom) {
        const vars = {
          client_name: client.name,
          invoice_number: inv.invoice_number,
          amount: formatAmount(inv.amount, inv.currency),
          due_date: inv.due_date,
          business_name: profile.business_name || 'Tabsy',
        }
        subject = interpolate(custom.subject, vars)
        body = interpolate(custom.body, vars) + bankSection(profile.bank_details, lang)
      } else {
        const template = getTemplate(offset, lang, {
          clientName: client.name,
          invoiceNumber: inv.invoice_number,
          amount: inv.amount,
          currency: inv.currency,
          dueDate: inv.due_date,
          businessName: profile.business_name || 'Tabsy',
          bankDetails: profile.bank_details,
        })
        subject = template.subject
        body = template.body
      }

      try {
        const { error: sendError } = await resend.emails.send({
          from: FROM,
          to: [client.contact_email],
          subject,
          text: body,
        })

        if (sendError) {
          results.push({ invoiceId: inv.id, offset, sent: false, error: sendError.message })
          continue
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error'
        results.push({ invoiceId: inv.id, offset, sent: false, error: message })
        continue
      }

      results.push({ invoiceId: inv.id, offset, sent: true })
    }
  }

  return { today, checked: invoices?.length ?? 0, results }
}
