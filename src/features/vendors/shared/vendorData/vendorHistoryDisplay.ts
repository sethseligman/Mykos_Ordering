import { formatItemLine, vendorItemMessageLabel } from '../../../../lib/buildOrderMessage'
import type { LastSentOrderSnapshot } from '../../../../types/lastSentOrder'
import type { VendorItem } from '../../../../types/order'
import type { VendorHistoryLine } from './types'

export function previewFromVendorHistoryLines(
  items: VendorHistoryLine[],
  catalog: VendorItem[],
): string {
  const byId = new Map(catalog.map((c) => [c.id, c]))
  const parts = items.slice(0, 2).map((it) => {
    const cat = byId.get(it.itemId)
    const label = cat ? vendorItemMessageLabel(cat) : it.itemId
    return formatItemLine(it.quantity, it.unitType, label)
  })
  return (parts.join(' · ') || '—') + (items.length > 2 ? '…' : '')
}

/** Catalog order; matches outbound line ordering. */
export function snapshotToOrderedHistoryLines(
  snapshot: LastSentOrderSnapshot,
  catalog: VendorItem[],
): VendorHistoryLine[] {
  const byId = new Map(snapshot.lines.map((l) => [l.vendorItemId, l]))
  const items: VendorHistoryLine[] = []
  for (const cat of catalog) {
    const line = byId.get(cat.id)
    if (!line || !line.included || !line.quantity.trim()) continue
    items.push({
      itemId: line.vendorItemId,
      quantity: line.quantity,
      unitType: line.unit,
      packSizeSnapshot: cat.packSize,
    })
  }
  return items
}
