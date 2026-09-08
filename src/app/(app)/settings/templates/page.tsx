import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { draftTemplates } from '@/lib/reminders/draft-templates'

const STAGES = [
  { offset: -3, label: '3 days before due' },
  { offset: 0, label: 'Due date' },
  { offset: 3, label: '3 days overdue' },
  { offset: 7, label: '7 days overdue' },
  { offset: 14, label: '14 days overdue' },
]

async function draftWithAI(language: 'ja' | 'en') {
  'use server'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .single()

  const drafts = await draftTemplates(language, profile?.business_name || 'Tabsy')

  for (const d of drafts) {
    await supabase
      .from('email_templates')
      .upsert(
        { user_id: user.id, language, stage_offset: d.offset, subject: d.subject, body: d.body },
        { onConflict: 'user_id,language,stage_offset' }
      )
  }

  redirect(`/settings/templates?lang=${language}&drafted=1`)
}

async function saveTemplate(
  id: string | undefined,
  userId: string,
  language: string,
  offset: number,
  formData: FormData
) {
  'use server'
  const supabase = await createClient()
  const subject = ((formData.get('subject') as string) || '').trim()
  const body = ((formData.get('body') as string) || '').trim()

  if (!subject && !body) {
    // Both cleared — delete the custom row so this stage falls back to
    // the built-in default again, rather than saving an empty template.
    if (id) await supabase.from('email_templates').delete().eq('id', id)
  } else {
    await supabase
      .from('email_templates')
      .upsert(
        { id, user_id: userId, language, stage_offset: offset, subject, body },
        { onConflict: 'user_id,language,stage_offset' }
      )
  }

  redirect(`/settings/templates?lang=${language}&saved=1`)
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; drafted?: string; saved?: string }>
}) {
  const params = await searchParams
  const language = params.lang === 'en' ? 'en' : 'ja'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: templates } = await supabase
    .from('email_templates')
    .select('*')
    .eq('user_id', user.id)
    .eq('language', language)

  const draftForLang = draftWithAI.bind(null, language)

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-xl font-medium">Reminder email templates</h1>
      <p className="mb-6 text-sm text-ink/60">
        These are what actually get sent by the daily reminder job. Leave a stage blank and it falls
        back to a built-in default.
      </p>

      <div className="mb-6 flex items-center gap-3">
        <a
          href="/settings/templates?lang=ja"
          className={`rounded-full px-3 py-1 text-sm ${language === 'ja' ? 'bg-ledger text-paper' : 'bg-ink/5 text-ink/60'}`}
        >
          Japanese
        </a>
        <a
          href="/settings/templates?lang=en"
          className={`rounded-full px-3 py-1 text-sm ${language === 'en' ? 'bg-ledger text-paper' : 'bg-ink/5 text-ink/60'}`}
        >
          English
        </a>
        <form action={draftForLang} className="ml-auto">
          <button
            type="submit"
            className="rounded-md bg-tabAccent/10 px-3 py-1.5 text-sm font-medium text-tabAccent"
          >
            Draft all 5 with AI
          </button>
        </form>
      </div>

      {params.drafted && (
        <p className="mb-4 rounded-md bg-tabAccent/10 px-4 py-2 text-sm text-ledger">
          AI draft generated below — review before it goes live.
        </p>
      )}
      {params.saved && (
        <p className="mb-4 rounded-md bg-tabAccent/10 px-4 py-2 text-sm text-ledger">Saved.</p>
      )}

      <div className="space-y-6">
        {STAGES.map((stage) => {
          const existing = templates?.find((t) => t.stage_offset === stage.offset)
          const saveWithStage = saveTemplate.bind(null, existing?.id, user.id, language, stage.offset)
          return (
            <div key={stage.offset} className="rounded-md border border-ink/10 p-4">
              <p className="mb-3 text-sm font-medium text-ink/80">{stage.label}</p>
              <form action={saveWithStage} className="space-y-2">
                <input
                  name="subject"
                  defaultValue={existing?.subject ?? ''}
                  placeholder="Subject — leave blank to use the built-in default"
                  className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
                />
                <textarea
                  name="body"
                  rows={4}
                  defaultValue={existing?.body ?? ''}
                  placeholder="Body — {{client_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{business_name}} fill in automatically"
                  className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
                />
                <button type="submit" className="rounded-md bg-ledger px-3 py-1.5 text-sm text-paper">
                  Save
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
