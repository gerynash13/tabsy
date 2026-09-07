import { createAdminClient } from '@/lib/supabase/admin'
import { todayInJST, addDays } from '@/lib/reminders/dates'
import { getTemplate } from '@/lib/reminders/templates'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.REMINDER_FROM_EMAIL || 'Tabsy <onboarding@resend.dev>'

// Runs once a day (see vercel.json). For each unpaid invoice, checks every
// offset in that user's reminder_offsets against today's date in JST, and
// sends whichever ones match — skipping anything already logged.
export async function GET(request: Request) {
  // In production, only Vercel's own scheduler (or someone with the
  // secret) can trigger this. Skipped in dev so you can hit this route
  // directly in the browser while testing.
  if (process.env.NODE_ENV === 'production') {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const today = todayInJST()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, amount, currency, due_date, status, clients(name, contact_email, preferred_language), profiles(business_name, bank_details, reminder_offsets)'
    )
    .eq('status', 'unpaid')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { invoiceId: string; offset: number; sent: boolean; error?: string }[] = []

  for (const inv of invoices ?? []) {
    const client = inv.clients as any
    const profile = inv.profiles as any
    if (!client?.contact_email || !profile) continue

    for (const offset of (profile.reminder_offsets as number[]) ?? []) {
      const targetDate = addDays(inv.due_date, offset)
      if (targetDate !== today) continue

      // Claim this invoice+offset by writing to reminder_log FIRST. The
      // unique constraint on (invoice_id, offset_days) means only one
      // attempt can ever win — that's what makes it safe to re-run this
      // route by accident, or if a future retry policy calls it twice.
      const { error: claimError } = await supabase
        .from('reminder_log')
        .insert({ invoice_id: inv.id, offset_days: offset })

      if (claimError) {
        // Someone already claimed it — already sent, nothing to do.
        results.push({ invoiceId: inv.id, offset, sent: false })
        continue
      }

      const lang: 'ja' | 'en' = client.preferred_language === 'en' ? 'en' : 'ja'
      const template = getTemplate(offset, lang, {
        clientName: client.name,
        invoiceNumber: inv.invoice_number,
        amount: inv.amount,
        currency: inv.currency,
        dueDate: inv.due_date,
        businessName: profile.business_name || 'Tabsy',
        bankDetails: profile.bank_details,
      })

      // Known limitation for now: if this send fails, the slot above is
      // still claimed, so it won't retry on the next run. Fine at MVP
      // scale where you can just check your own dashboard — worth a
      // proper retry/dead-letter approach before this handles real
      // customers' money-critical email at any volume.
      try {
        const { error: sendError } = await resend.emails.send({
          from: FROM,
          to: [client.contact_email],
          subject: template.subject,
          text: template.body,
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

  return NextResponse.json({ today, checked: invoices?.length ?? 0, results })
}
