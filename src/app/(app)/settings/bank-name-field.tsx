'use client'

import { useState } from 'react'

const BANKS = [
  '三菱UFJ銀行',
  '三井住友銀行',
  'みずほ銀行',
  'りそな銀行',
  'ゆうちょ銀行',
  '楽天銀行',
  'PayPay銀行',
  '住信SBIネット銀行',
]

export function BankNameField({
  defaultValue,
  label,
  otherLabel,
}: {
  defaultValue: string
  label: string
  otherLabel: string
}) {
  const isKnown = BANKS.includes(defaultValue)
  const [showOther, setShowOther] = useState(!isKnown && !!defaultValue)

  return (
    <div>
      <label className="mb-1 block text-sm text-ink/60">{label}</label>
      <select
        name={showOther ? undefined : 'bank_name'}
        defaultValue={showOther ? 'その他' : defaultValue}
        onChange={(e) => setShowOther(e.target.value === 'その他')}
        className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
      >
        <option value="">—</option>
        {BANKS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
        <option value="その他">{otherLabel}</option>
      </select>
      {showOther && (
        <input
          name="bank_name"
          defaultValue={isKnown ? '' : defaultValue}
          placeholder={label}
          className="mt-2 w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
        />
      )}
    </div>
  )
}
