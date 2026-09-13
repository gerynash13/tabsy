'use client'

import { useState } from 'react'
import type { LineItem } from '@/lib/invoices/calculate'

type Dict = {
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
  addRow: string
  remove: string
  unitPriceHint: string
}

const EMPTY_ITEM: LineItem = { description: '', quantity: 1, unit_price: 0, tax_rate: 0.1 }

export function LineItemsEditor({ initialItems, dict }: { initialItems: LineItem[]; dict: Dict }) {
  const [items, setItems] = useState<LineItem[]>(initialItems.length ? initialItems : [EMPTY_ITEM])

  function update(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function addRow() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }
  function removeRow(i: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="line_items_json" value={JSON.stringify(items)} />
      <p className="text-xs text-ink/50">{dict.unitPriceHint}</p>
      {items.map((item, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          <input
            value={item.description}
            onChange={(e) => update(i, { description: e.target.value })}
            placeholder={dict.description}
            className="min-w-[140px] flex-1 rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ledger"
          />
          <input
            type="number"
            step="1"
            min="0"
            value={item.quantity}
            onChange={(e) => update(i, { quantity: Number(e.target.value) })}
            placeholder={dict.quantity}
            className="w-16 rounded-md border border-ink/15 px-2 py-2 text-sm outline-none focus:border-ledger"
          />
          <input
            type="number"
            step="1"
            min="0"
            value={item.unit_price}
            onChange={(e) => update(i, { unit_price: Number(e.target.value) })}
            placeholder={dict.unitPrice}
            className="w-28 rounded-md border border-ink/15 px-2 py-2 text-sm outline-none focus:border-ledger"
          />
          <select
            value={item.tax_rate}
            onChange={(e) => update(i, { tax_rate: Number(e.target.value) })}
            className="w-24 rounded-md border border-ink/15 px-2 py-2 text-sm outline-none focus:border-ledger"
          >
            <option value={0.1}>10%</option>
            <option value={0.08}>8%</option>
          </select>
          <button
            type="button"
            onClick={() => removeRow(i)}
            className="rounded-md border border-ink/15 px-2 py-2 text-sm text-overdue"
          >
            {dict.remove}
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-sm text-ledger hover:underline">
        {dict.addRow}
      </button>
    </div>
  )
}
