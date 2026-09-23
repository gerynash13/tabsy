import { stripe } from './client'
import { toStripeAmount } from './amount'

// Deliberately using the Payment Links API, not Checkout Sessions.
// Checkout Sessions expire after a maximum of 24 hours — useless for a
// reminder sequence that runs across 17 days (-3 to +14). Payment Links
// persist until manually deactivated, which is what this whole feature
// actually needs: create once, reuse across every reminder email, until
// the invoice is paid or edited.
export async function createInvoicePaymentLink({
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  businessName,
}: {
  invoiceId: string
  invoiceNumber: string
  amount: number
  currency: string
  businessName: string
}) {
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toStripeAmount(amount, currency),
          product_data: {
            name: `${businessName} — Invoice ${invoiceNumber}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { invoice_id: invoiceId },
    after_completion: {
      type: 'hosted_confirmation',
      hosted_confirmation: {
        custom_message: 'Thank you — your payment has been received.',
      },
    },
  })

  // client_reference_id is Stripe's own documented mechanism for
  // reconciling a completed session back to something in your system —
  // more reliable than depending on metadata inheriting from the
  // Payment Link onto the Checkout Session it generates. Appended here
  // so nothing downstream has to remember to add it.
  const url = `${paymentLink.url}?client_reference_id=${encodeURIComponent(invoiceId)}`

  return { id: paymentLink.id, url }
}

// Best-effort cleanup — used when an invoice is paid, or when its
// amount/currency changes and the existing link would charge the wrong
// thing. Swallows errors rather than blocking the caller, since this is
// a "tidy up" step, not the primary action.
export async function deactivatePaymentLink(paymentLinkId: string) {
  try {
    await stripe.paymentLinks.update(paymentLinkId, { active: false })
  } catch (err) {
    console.error('Failed to deactivate Stripe payment link:', err)
  }
}
