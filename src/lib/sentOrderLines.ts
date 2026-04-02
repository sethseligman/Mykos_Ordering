import { formatItemLine, vendorItemMessageLabel } from './buildOrderMessage'
import type { LastSentOrderSnapshot } from '../types/lastSentOrder'
import type { VendorItem } from '../types/order'

/** Lines like "2 cs Lamb Racks" from a sent snapshot (catalog order). */
export function linesFromSentSnapshot(
  snapshot: LastSentOrderSnapshot,
  catalog: VendorItem[],
): string[] {
  const byId = new Map(snapshot.lines.map((l) => [l.vendorItemId, l]))
  const out: string[] = []
  for (const cat of catalog) {
    const row = byId.get(cat.id)
    if (!row || !row.included || !row.quantity.trim()) continue
    out.push(
      formatItemLine(row.quantity, row.unit, vendorItemMessageLabel(cat)),
    )
  }
  return out
}
