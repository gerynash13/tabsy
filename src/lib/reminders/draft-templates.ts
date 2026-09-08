import OpenAI from 'openai'

// Groq's free tier: no credit card required, ~30 requests/minute — plenty
// for a button clicked occasionally to draft templates, since this is
// never called at reminder-send time (see the cron route). Groq exposes
// an OpenAI-compatible API, so swapping providers later is just changing
// baseURL/apiKey/model — nothing else in the app needs to know or care.
//
// To switch to OpenRouter instead:
//   baseURL: 'https://openrouter.ai/api/v1'
//   apiKey: process.env.OPENROUTER_API_KEY
//   MODEL: a current ":free" model id from openrouter.ai/models
//   (free model IDs there rotate more often than Groq's, so check before relying on one)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

const MODEL = 'openai/gpt-oss-20b' // Groq's free tier model, ~30 requests/minute

const STAGES = [
  { offset: -3, tone: 'a friendly heads-up, sent 3 days before the invoice is due' },
  { offset: 0, tone: 'a neutral note that the invoice is due today' },
  { offset: 3, tone: 'a polite but slightly firmer follow-up, 3 days after the due date' },
  { offset: 7, tone: 'a firmer, still professional follow-up, 7 days overdue' },
  { offset: 14, tone: 'a clearly urgent but still professional message, 14 days overdue' },
]

// Drafts all 5 staged reminder emails at once, in one language, for one
// user's business. This runs once when the user clicks "Draft with AI" —
// never at send time — and the result is a starting point for the user
// to review and edit, not something that ships straight to a client.
export async function draftTemplates(language: 'ja' | 'en', businessName: string) {
  const languageName = language === 'ja' ? 'Japanese (natural, polite business keigo)' : 'English'

  const prompt = `Write ${STAGES.length} invoice payment reminder emails in ${languageName}, one for each stage below, sent on behalf of a freelancer or small business called "${businessName}".

Stages:
${STAGES.map((s) => `- offset ${s.offset}: ${s.tone}`).join('\n')}

Rules:
- Use exactly these placeholders where relevant, written literally with double curly braces: {{client_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{business_name}}. Do not invent other placeholders.
- Do not include any payment or bank details — those are appended separately by the system afterward.
- Keep each email to 3-5 sentences.
- Respond with ONLY a JSON array, no markdown fences, no commentary, in exactly this shape:
[{"offset": -3, "subject": "...", "body": "..."}, ...]`

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = response.choices[0]?.message?.content ?? '[]'
  const cleaned = raw.replace(/```json|```/g, '').trim()

  return JSON.parse(cleaned) as { offset: number; subject: string; body: string }[]
}
