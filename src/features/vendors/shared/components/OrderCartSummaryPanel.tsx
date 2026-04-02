import type { OrderItem, VendorItem } from '../../../../types/order'
import { vendorItemMessageLabel } from '../../../../lib/buildOrderMessage'

type Props = {
  items: OrderItem[]
  catalog: VendorItem[]
}

export function OrderCartSummaryPanel({ items, catalog }: Props) {
  const byId = new Map(catalog.map((c) => [c.id, c]))
  const included = items.filter((i) => i.included)

  return (
    <div className="flex min-h-[14rem] flex-col rounded-md border border-stone-300 bg-[#faf8f5] shadow-inner">
      <div className="border-b border-stone-200/80 bg-stone-100/70 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          Order cart
        </p>
      </div>
      <div className="flex-1 p-3 text-sm text-stone-800">
        {included.length === 0 ? (
          <p className="text-xs text-stone-500">No items selected yet.</p>
        ) : (
          <ul className="space-y-1">
            {included.map((row) => {
              const meta = byId.get(row.vendorItemId)
              const label = meta ? vendorItemMessageLabel(meta) : row.vendorItemId
              return (
                <li key={row.vendorItemId} className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{label}</span>
                  <span className="shrink-0 font-mono text-xs">
                    {row.quantity || '-'} {row.unit}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

