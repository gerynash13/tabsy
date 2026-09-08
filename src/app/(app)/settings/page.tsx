import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function updateProfile(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const bank_details = {
    bank_name: formData.get('bank_name') as string,
    branch_name: formData.get('branch_name') as string,
    account_type: formData.get('account_type') as string,
    account_number: formData.get('account_number') as string,
    account_holder: formData.get('account_holder') as string,
  }

  await supabase
    .from('profiles')
    .update({
      business_name: formData.get('business_name') as string,
      bank_details,
    })
    .eq('id', user.id)

  redirect('/settings?saved=1')
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const bank = (profile?.bank_details ?? {}) as Record<string, string>

  return (
    <div className="max-w-md">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Settings</h1>
        <Link href="/settings/templates" className="text-sm text-ledger hover:underline">
          Manage email templates →
        </Link>
      </div>

      {params.saved && (
        <p className="mb-4 rounded-md bg-tabAccent/10 px-4 py-2 text-sm text-ledger">Saved.</p>
      )}

      <form action={updateProfile} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink/60">Business name</label>
          <input
            name="business_name"
            defaultValue={profile?.business_name ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>

        <div className="pt-2">
          <p className="text-sm font-medium text-ink/80">Bank transfer details (振込先)</p>
          <p className="text-xs text-ink/50">Shown to clients in reminder emails, so they know where to send payment.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink/60">Bank name</label>
          <input
            name="bank_name"
            defaultValue={bank.bank_name ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">Branch name</label>
          <input
            name="branch_name"
            defaultValue={bank.branch_name ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">Account type</label>
            <input
              name="account_type"
              defaultValue={bank.account_type ?? ''}
              placeholder="普通 / 当座"
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">Account number</label>
            <input
              name="account_number"
              defaultValue={bank.account_number ?? ''}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">Account holder</label>
          <input
            name="account_holder"
            defaultValue={bank.account_holder ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>

        <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
          Save
        </button>
      </form>
    </div>
  )
}
