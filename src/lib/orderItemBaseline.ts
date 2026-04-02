import type { LastSentOrderSnapshot } from '../types/lastSentOrder'
import type { OrderItem, VendorItem } from '../types/order'
import { snapshotLinesToMap } from './lastSentOrderStorage'

export function normalizeItemField(value?: string): string {
  return value?.trim() ?? ''
}

/**
 * Overwrites display-only lastQuantity / lastUnit from the last sent snapshot when present.
 * Otherwise leaves row as-is (mock / prior draft).
 */
export function applyLastSentBaselineToOrderItems(
  items: OrderItem[],
  catalog: VendorItem[],
  snapshot: LastSentOrderSnapshot | null,
): OrderItem[] {
  const byId = new Map(items.map((r) => [r.vendorItemId, r]))
  const snapMap = snapshot ? snapshotLinesToMap(snapshot.lines) : null

  return catalog.map((cat) => {
    const row = byId.get(cat.id)
    if (!row) {
      return {
        vendorItemId: cat.id,
        included: false,
        quantity: '',
        unit: cat.unit,
      }
    }
    if (!snapMap) return row
    const line = snapMap.get(cat.id)
    if (!line) return row
    return {
      ...row,
      lastQuantity: line.included ? line.quantity : '',
      lastUnit: line.unit?.trim() ? line.unit : cat.unit,
    }
  })
}

export function getComparisonBaseline(
  row: OrderItem,
  snapshot: LastSentOrderSnapshot | null,
): { included: boolean; quantity: string; unit: string } {
  if (snapshot?.lines?.length) {
    const m = snapshotLinesToMap(snapshot.lines)
    const line = m.get(row.vendorItemId)
    if (line) {
      return {
        included: line.included,
        quantity: line.quantity,
        unit: line.unit,
      }
    }
    return { included: false, quantity: '', unit: row.unit }
  }
  return {
    included: normalizeItemField(row.lastQuantity) !== '',
    quantity: row.lastQuantity ?? '',
    unit: row.lastUnit ?? '',
  }
}

export function isOrderRowChanged(
  row: OrderItem,
  snapshot: LastSentOrderSnapshot | null,
): boolean {
  const b = getComparisonBaseline(row, snapshot)
  return (
    row.included !== b.included ||
    normalizeItemField(row.quantity) !== normalizeItemField(b.quantity) ||
    normalizeItemField(row.unit) !== normalizeItemField(b.unit)
  )
}
