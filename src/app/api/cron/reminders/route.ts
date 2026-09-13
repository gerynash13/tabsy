import { runReminderSweep } from '@/lib/reminders/run-sweep'
import { NextResponse } from 'next/server'

// Runs once a day (see vercel.json). All the actual logic lives in
// runReminderSweep() so the manual "send reminders now" button in
// Settings can share the exact same code path.
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await runReminderSweep()
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('[cron/reminders] unhandled failure:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
