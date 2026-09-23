import { stripe } from '@/lib/stripe/client'
import { deactivatePaymentLink } from '@/lib/stripe/payment-link'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

// Signature verification needs the RAW request body — request.text(),
// never request.json(). Next.js's App Router doesn't auto-parse the
// body the way the old Pages Router did, but it's still an easy mistake
// to introduce later (a middleware or helper that calls .json() first
// would silently break every webhook). Without this check, anyone who
// discovers this URL could POST a fake "payment succeeded" event and
// mark any invoice paid for free.
export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid signature'
    console.error('[webhooks/stripe] signature verification failed:', message)
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  // checkout.session.completed covers card and other instant payment
  // methods. checkout.session.async_payment_succeeded covers ones that
  // settle later — relevant for Japan specifically, where Konbini and
  // bank-transfer methods (if enabled on the account) don't confirm
  // instantly.
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session
    const invoiceId = session.client_reference_id

    if (invoiceId) {
      const supabase = createAdminClient()
      const { data: invoice } = await supabase
        .from('invoices')
        .select('status, stripe_payment_link_id')
        .eq('id', invoiceId)
        .maybeSingle()

      // Guards against double-processing if Stripe redelivers the same
      // event (its webhooks are at-least-once delivery, not exactly-once).
      if (invoice && invoice.status !== 'paid') {
        await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)
        if (invoice.stripe_payment_link_id) {
          await deactivatePaymentLink(invoice.stripe_payment_link_id)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
