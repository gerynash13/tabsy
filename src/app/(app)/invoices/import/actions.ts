'use server'

import { createClient } from '@/lib/supabase/server'
import { decodeCsv } from '@/lib/csv/decode'
import { parseDate } from '@/lib/csv/parse-date'
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '@/lib/invoices/currencies'
import { redirect } from 'next/navigation'
import Papa from 'papaparse'

export type ImportState = { success: number; errors: string[] }

export async function importCsvAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return { success: 0, errors: ['No file selected.'] }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const text = decodeCsv(buffer)
  const { data: rows } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  const errors: string[] = []
  let success = 0

  // Avoid creating the same new client twice within one file — matched
  // once, reused for every subsequent row in this same import.
  const clientCache = new Map<string, string>()

  for (const [i, row] of rows.entries()) {
    const rowNum = i + 2 // +1 for the header row, +1 for 1-indexing
    const clientName = row.client_name?.trim()
    const clientEmail = row.client_email?.trim()
    const invoiceNumber = row.invoice_number?.trim()
    const amount = Number(row.amount)
    const dueDate = row.due_date ? parseDate(row.due_date) : null

    if (!clientName) {
      errors.push(`Row ${rowNum}: missing client_name`)
      continue
    }
    if (!invoiceNumber) {
      errors.push(`Row ${rowNum}: missing invoice_number`)
      continue
    }
    if (!amount || Number.isNaN(amount)) {
      errors.push(`Row ${rowNum}: invalid amount "${row.amount}"`)
      continue
    }
    if (!dueDate) {
      errors.push(`Row ${rowNum}: invalid due_date "${row.due_date}" (use YYYY-MM-DD or YYYY/MM/DD)`)
      continue
    }

    const currency = (row.currency?.trim() || 'JPY').toUpperCase()
    if (!isSupportedCurrency(currency)) {
      errors.push(`Row ${rowNum}: unsupported currency "${row.currency}" (supported: ${SUPPORTED_CURRENCIES.join(', ')})`)
      continue
    }

    const cacheKey = (clientEmail || clientName).toLowerCase()
    let clientId = clientCache.get(cacheKey)

    if (!clientId) {
      const { data: existing } = clientEmail
        ? await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .ilike('contact_email', clientEmail)
            .maybeSingle()
        : await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .ilike('name', clientName)
            .maybeSingle()

      if (existing) {
        clientId = existing.id
      } else {
        const { data: created, error: createError } = await supabase
          .from('clients')
          .insert({ user_id: user.id, name: clientName, contact_email: clientEmail || null })
          .select('id')
          .single()

        if (createError || !created) {
          errors.push(`Row ${rowNum}: failed to create client "${clientName}"`)
          continue
        }
        clientId = created.id
      }
      clientCache.set(cacheKey, clientId)
    }

    const { error: invoiceError } = await supabase.from('invoices').insert({
      user_id: user.id,
      client_id: clientId,
      invoice_number: invoiceNumber,
      amount,
      currency,
      due_date: dueDate,
      notes: row.notes?.trim() || null,
    })

    if (invoiceError) {
      errors.push(`Row ${rowNum}: ${invoiceError.message}`)
    } else {
      success++
    }
  }

  return { success, errors }
}
