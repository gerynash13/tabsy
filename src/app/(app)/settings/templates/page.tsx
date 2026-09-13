import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/get-locale'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { redirect } from 'next/navigation'
import { draftTemplates, draftSingleTemplate } from '@/lib/reminders/draft-templates'

const OFFSETS = [-3, 0, 3, 7, 14] as const

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

  redirect(`/settings/templates?lang=${language}&drafted=all`)
}

async function draftOneWithAI(language: 'ja' | 'en', offset: number) {
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

  const draft = await draftSingleTemplate(language, profile?.business_name || 'Tabsy', offset)

  await supabase
    .from('email_templates')
    .upsert(
      { user_id: user.id, language, stage_offset: offset, subject: draft.subject, body: draft.body },
      { onConflict: 'user_id,language,stage_offset' }
    )

  redirect(`/settings/templates?lang=${language}&drafted=${offset}`)
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
  const dict = getDictionary(await getLocale())
  const t = dict.templates

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
      <h1 className="mb-2 text-xl font-medium">{t.title}</h1>
      <p className="mb-6 text-sm text-ink/60">{t.description}</p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <a
          href="/settings/templates?lang=ja"
          className={`rounded-full px-3 py-1 text-sm ${language === 'ja' ? 'bg-ledger text-paper' : 'bg-ink/5 text-ink/60'}`}
        >
          {t.japanese}
        </a>
        <a
          href="/settings/templates?lang=en"
          className={`rounded-full px-3 py-1 text-sm ${language === 'en' ? 'bg-ledger text-paper' : 'bg-ink/5 text-ink/60'}`}
        >
          {t.english}
        </a>
        <form action={draftForLang} className="ml-auto">
          <button type="submit" className="rounded-md bg-tabAccent/10 px-3 py-1.5 text-sm font-medium text-tabAccent">
            {t.draftAll}
          </button>
        </form>
      </div>

      {params.drafted === 'all' && (
        <p className="mb-4 rounded-md bg-tabAccent/10 px-4 py-2 text-sm text-ledger">{t.draftedAll}</p>
      )}
      {params.drafted && params.drafted !== 'all' && (
        <p className="mb-4 rounded-md bg-tabAccent/10 px-4 py-2 text-sm text-ledger">
          {t.draftedOnePrefix}
          {t.stages[String(Number(params.drafted)) as keyof typeof t.stages]}
          {t.draftedOneSuffix}
        </p>
      )}
      {params.saved && <p className="mb-4 rounded-md bg-tabAccent/10 px-4 py-2 text-sm text-ledger">{t.saved}</p>}

      <div className="space-y-6">
        {OFFSETS.map((offset) => {
          const label = t.stages[String(offset) as keyof typeof t.stages]
          const existing = templates?.find((tpl) => tpl.stage_offset === offset)
          const saveWithStage = saveTemplate.bind(null, existing?.id, user.id, language, offset)
          const draftThisOne = draftOneWithAI.bind(null, language, offset)
          return (
            <div key={offset} className="rounded-md border border-ink/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-ink/80">{label}</p>
                <form action={draftThisOne}>
                  <button type="submit" className="text-xs font-medium text-tabAccent hover:underline">
                    {t.regenerate}
                  </button>
                </form>
              </div>
              <form action={saveWithStage} className="space-y-2">
                <input
                  name="subject"
                  defaultValue={existing?.subject ?? ''}
                  placeholder={t.subjectPlaceholder}
                  className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
                />
                <textarea
                  name="body"
                  rows={4}
                  defaultValue={existing?.body ?? ''}
                  placeholder={t.bodyPlaceholder}
                  className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
                />
                <button type="submit" className="rounded-md bg-ledger px-3 py-1.5 text-sm text-paper">
                  {t.save}
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
