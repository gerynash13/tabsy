import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client for server-only, cross-user work — the cron job
// needs to see every user's invoices, not just one signed-in person's,
// so it can't use the regular anon-key client (RLS would return nothing).
//
// This key bypasses Row Level Security entirely. Never expose it to the
// browser, and never give its env var a NEXT_PUBLIC_ prefix.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
