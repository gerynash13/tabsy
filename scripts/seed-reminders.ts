// Run with: npm run seed
//
// Creates five test invoices for your first client, with due dates set so
// that TODAY matches each of the default reminder offsets (-3, 0, 3, 7,
// 14). That means a single cron run right after seeding should find and
// send all five at once — the fastest way to check the whole pipeline
// without waiting days between real due dates.
import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '../src/lib/supabase/admin'
import { addDays, todayInJST } from '../src/lib/reminders/dates'

async function main() {
  const supabase = createAdminClient()

  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single()
  if (!profile) {
    console.error('No profile found — sign in to the app at least once first.')
    process.exit(1)
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, contact_email')
    .eq('user_id', profile.id)
    .limit(1)
    .single()

  if (!client) {
    console.error('No client found — create at least one client in the app first.')
    process.exit(1)
  }

  if (!client.contact_email) {
    console.warn(
      `Warning: "${client.name}" has no contact email set — the cron job will skip it. ` +
        'Set the client\'s email to your own address if you want to actually see the reminder land.'
    )
  }

  const today = todayInJST()
  const offsets = [-3, 0, 3, 7, 14]

  for (const offset of offsets) {
    // today = due_date + offset  =>  due_date = today - offset
    const dueDate = addDays(today, -offset)

    const { error } = await supabase.from('invoices').insert({
      user_id: profile.id,
      client_id: client.id,
      invoice_number: `TEST-${offset}`,
      amount: 50000,
      currency: 'JPY',
      due_date: dueDate,
      status: 'unpaid',
    })

    if (error) {
      console.error(`Failed to create TEST-${offset}:`, error.message)
    } else {
      console.log(`Created TEST-${offset} for ${client.name}, due ${dueDate} (offset ${offset})`)
    }
  }
}

main()
