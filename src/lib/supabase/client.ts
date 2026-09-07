import { createBrowserClient } from '@supabase/ssr'

// Browser client — only needed if you add client components later
// (Week 1's CRUD is all Server Actions, so this isn't used yet).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
