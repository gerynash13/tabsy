'use client'

import { useActionState } from 'react'
import { sendNowAction, type SendNowState } from './send-now-actions'

type SendNowDict = {
  sendNow: string
  checking: string
  sendNowResultPrefix: string
  sendNowResultMid: string
  sendNowErrorsSuffix: string
}

export function SendNowButton({ dict }: { dict: SendNowDict }) {
  const [state, formAction, isPending] = useActionState<SendNowState, FormData>(
    async () => sendNowAction(),
    null
  )

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-ink/15 px-3 py-1.5 text-sm text-ink/70 disabled:opacity-50"
      >
        {isPending ? dict.checking : dict.sendNow}
      </button>

      {state && (
        <p className="mt-3 text-sm text-ink/60">
          {dict.sendNowResultPrefix} {state.checked} {dict.sendNowResultMid} {state.sent}.
          {state.errors.length > 0 && (
            <span className="text-overdue"> {state.errors.length} {dict.sendNowErrorsSuffix}</span>
          )}
        </p>
      )}
    </form>
  )
}
