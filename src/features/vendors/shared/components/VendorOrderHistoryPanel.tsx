import { useMemo } from 'react'
import { formatItemLine, vendorItemMessageLabel } from '../../../../lib/buildOrderMessage'
import type { VendorItem } from '../../../../types/order'
import type { VendorRichHistoryEntry } from '../vendorData/types'

type Props = {
  rows: VendorRichHistoryEntry[]
  catalog: VendorItem[]
  expandedKey: string | null
  onToggle: (key: string) => void
}

function rowKey(row: VendorRichHistoryEntry): string {
  return `${row.sentAt}-${row.orderDate}`
}

export function VendorOrderHistoryPanel({
  rows,
  catalog,
  expandedKey,
  onToggle,
}: Props) {
  const byId = useMemo(
    () => new Map(catalog.map((c) => [c.id, c])),
    [catalog],
  )

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-600">
        Order history
      </h2>
      <p className="mb-3 text-xs text-stone-500">
        Seeded past orders plus orders marked sent from this app. Tap a row to
        expand line items.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
          No orders yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const key = rowKey(row)
            const open = expandedKey === key
            return (
              <li
                key={key}
                className="rounded-md border border-stone-300 bg-white text-sm shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onToggle(key)}
                  className="flex w-full flex-wrap items-start justify-between gap-2 px-3 py-3 text-left hover:bg-stone-50"
                  aria-expanded={open}
                >
                  <div>
                    <span className="font-medium text-stone-900">
                      Order {row.orderDate}
                      {row.source === 'seed' ? (
                        <span className="ml-2 text-xs font-normal text-stone-500">
                          (seed)
                        </span>
                      ) : null}
                    </span>
                    <p className="mt-1 text-xs text-stone-500">
                      Delivery{' '}
                      {row.deliveryDate.trim() ? row.deliveryDate : '—'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-stone-500">
                    {open ? '▲' : '▼'}
                  </span>
                </button>
                {open ? (
                  row.items.length > 0 ? (
                    <ul className="border-t border-stone-200 bg-stone-50/80 px-3 py-2">
                      {row.items.map((it, i) => {
                        const cat = byId.get(it.itemId)
                        const label = cat
                          ? vendorItemMessageLabel(cat)
                          : it.itemId
                        return (
                          <li
                            key={`${it.itemId}-${i}`}
                            className="font-mono text-[13px] leading-relaxed text-stone-800"
                          >
                            {formatItemLine(it.quantity, it.unitType, label)}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="border-t border-stone-200 bg-stone-50/80 px-3 py-2">
                      <p className="mb-1 text-xs italic text-stone-500">
                        Older saves did not store line items; summary only:
                      </p>
                      <p className="font-mono text-[13px] leading-relaxed text-stone-800">
                        {row.preview}
                      </p>
                    </div>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
