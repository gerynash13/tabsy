import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoiceDocument } from '@/lib/invoice-pdf/InvoiceDocument'
import type { LineItem } from '@/lib/invoices/calculate'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(name, company_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const items = (invoice.line_items as LineItem[]) ?? []
  if (items.length === 0) {
    return NextResponse.json(
      { error: 'This invoice has no line items yet — add at least one before generating a PDF.' },
      { status: 400 }
    )
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const client = invoice.clients as { name: string; company_name: string | null } | null

  const buffer = await renderToBuffer(
    <InvoiceDocument
      invoiceNumber={invoice.invoice_number}
      issueDate={invoice.issue_date ?? invoice.due_date}
      dueDate={invoice.due_date}
      businessName={profile?.business_name || 'Tabsy'}
      registrationNumber={profile?.invoice_registration_number}
      bankDetails={profile?.bank_details}
      clientName={client?.company_name || client?.name || ''}
      items={items}
      currency={invoice.currency}
    />
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
    },
  })
}
