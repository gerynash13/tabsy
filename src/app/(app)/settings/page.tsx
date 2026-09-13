import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BankNameField } from './bank-name-field'
import { SendNowButton } from './send-now-button'

async function updateProfile(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const registrationNumberRaw = ((formData.get('invoice_registration_number') as string) || '').trim()
  if (registrationNumberRaw && !/^T\d{13}$/.test(registrationNumberRaw)) {
    redirect('/settings?error=registration')
  }

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
      invoice_registration_number: registrationNumberRaw || null,
      bank_details,
    })
    .eq('id', user.id)

  redirect('/settings?saved=1')
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const params = await searchParams
  const dict = getDictionary(await getLocale())
  const s = dict.settings

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
        <h1 className="text-xl font-medium">{s.title}</h1>
        <Link href="/settings/templates" className="text-sm text-ledger hover:underline">
          {s.manageTemplates}
        </Link>
      </div>

      {params.saved && <p className="mb-4 rounded-md bg-tabAccent/10 px-4 py-2 text-sm text-ledger">{s.saved}</p>}
      {params.error === 'registration' && (
        <p className="mb-4 rounded-md bg-overdue/10 px-4 py-2 text-sm text-overdue">{s.registrationNumberError}</p>
      )}

      <form action={updateProfile} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-ink/60">{s.businessName}</label>
          <input
            name="business_name"
            defaultValue={profile?.business_name ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink/60">{s.registrationNumber}</label>
          <input
            name="invoice_registration_number"
            defaultValue={profile?.invoice_registration_number ?? ''}
            placeholder="T1234567890123"
            pattern="T\d{13}"
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
          <p className="mt-1 text-xs text-ink/50">{s.registrationNumberHint}</p>
        </div>

        <div className="pt-2">
          <p className="text-sm font-medium text-ink/80">{s.bankSectionTitle}</p>
          <p className="text-xs text-ink/50">{s.bankSectionDescription}</p>
        </div>

        <BankNameField defaultValue={bank.bank_name ?? ''} label={s.bankName} otherLabel={s.bankNameOther} />

        <div>
          <label className="mb-1 block text-sm text-ink/60">{s.branchName}</label>
          <input
            name="branch_name"
            defaultValue={bank.branch_name ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">{s.accountType}</label>
            <select
              name="account_type"
              defaultValue={bank.account_type ?? ''}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            >
              <option value="">—</option>
              <option value="普通">普通 (ordinary)</option>
              <option value="当座">当座 (checking)</option>
              <option value="貯蓄">貯蓄 (savings)</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm text-ink/60">{s.accountNumber}</label>
            <input
              name="account_number"
              defaultValue={bank.account_number ?? ''}
              className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">{s.accountHolder}</label>
          <input
            name="account_holder"
            defaultValue={bank.account_holder ?? ''}
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
        </div>

        <button type="submit" className="rounded-md bg-ledger px-4 py-2 text-sm text-paper">
          {s.save}
        </button>
      </form>

      <div className="mt-10 border-t border-ink/10 pt-6">
        <p className="mb-1 text-sm font-medium text-ink/80">{s.reminderEngineTitle}</p>
        <p className="mb-3 text-xs text-ink/50">{s.reminderEngineDescription}</p>
        <SendNowButton dict={s} />
      </div>
    </div>
  )
}
