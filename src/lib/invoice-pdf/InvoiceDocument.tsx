import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { calculateTaxGroups, type LineItem } from '@/lib/invoices/calculate'

// @react-pdf/renderer's default fonts (Helvetica etc.) have no Japanese
// glyphs at all — without this, every CJK character silently renders as
// garbled bytes instead of failing loudly. Noto Sans JP covers the full
// character set this document needs.
Font.register({
  family: 'Noto Sans JP',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFPYk75s.ttf', fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Noto Sans JP' },
  title: { fontSize: 18, marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  section: { marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingVertical: 4,
    fontFamily: 'Noto Sans JP',
    fontWeight: 'bold',
  },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 4 },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colRate: { flex: 1, textAlign: 'right' },
  colAmount: { flex: 1.5, textAlign: 'right' },
  totalsBlock: { marginTop: 16, alignItems: 'flex-end' },
  totalsRow: { flexDirection: 'row', gap: 24, marginBottom: 2 },
  grandTotal: { marginTop: 6, fontSize: 13, fontFamily: 'Noto Sans JP', fontWeight: 'bold' },
  bankSection: { marginTop: 28 },
  note: { marginTop: 12, fontSize: 8, color: '#666' },
})

type BankDetails = {
  bank_name?: string
  branch_name?: string
  account_type?: string
  account_number?: string
  account_holder?: string
}

type Props = {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  businessName: string
  registrationNumber?: string | null
  bankDetails?: BankDetails | null
  clientName: string
  items: LineItem[]
  currency: string
}

export function InvoiceDocument({
  invoiceNumber,
  issueDate,
  dueDate,
  businessName,
  registrationNumber,
  bankDetails,
  clientName,
  items,
  currency,
}: Props) {
  const groups = calculateTaxGroups(items)
  const total = groups.reduce((sum, g) => sum + g.total, 0)
  const hasReducedRate = items.some((i) => i.tax_rate === 0.08)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>請求書</Text>

        <View style={styles.headerRow}>
          <Text>{clientName} 様</Text>
          <View>
            <Text>請求書番号: {invoiceNumber}</Text>
            <Text>発行日: {issueDate}</Text>
            <Text>お支払期日: {dueDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text>{businessName}</Text>
          {registrationNumber && <Text>登録番号: {registrationNumber}</Text>}
        </View>

        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>品目</Text>
            <Text style={styles.colQty}>数量</Text>
            <Text style={styles.colPrice}>単価</Text>
            <Text style={styles.colRate}>税率</Text>
            <Text style={styles.colAmount}>金額（税抜）</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>
                {item.description}
                {item.tax_rate === 0.08 ? ' ※' : ''}
              </Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{item.unit_price.toLocaleString()}</Text>
              <Text style={styles.colRate}>{Math.round(item.tax_rate * 100)}%</Text>
              <Text style={styles.colAmount}>{(item.quantity * item.unit_price).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {hasReducedRate && <Text style={styles.note}>※ 軽減税率対象品目</Text>}

        <View style={styles.totalsBlock}>
          {groups.map((g) => (
            <View key={g.rate} style={styles.totalsRow}>
              <Text>
                {Math.round(g.rate * 100)}%対象小計: {currency} {g.subtotal.toLocaleString()}
              </Text>
              <Text>
                消費税（{Math.round(g.rate * 100)}%）: {currency} {g.tax.toLocaleString()}
              </Text>
            </View>
          ))}
          <Text style={styles.grandTotal}>
            合計: {currency} {total.toLocaleString()}
          </Text>
        </View>

        {bankDetails?.bank_name && (
          <View style={styles.bankSection}>
            <Text>【お振込先】</Text>
            <Text>銀行名: {bankDetails.bank_name}</Text>
            <Text>支店名: {bankDetails.branch_name}</Text>
            <Text>口座種別: {bankDetails.account_type}</Text>
            <Text>口座番号: {bankDetails.account_number}</Text>
            <Text>口座名義: {bankDetails.account_holder}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
