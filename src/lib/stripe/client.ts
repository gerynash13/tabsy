import Stripe from 'stripe'

// apiVersion deliberately omitted — letting the installed SDK version's
// own pinned default apply, rather than hardcoding a version string that
// could go stale.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
