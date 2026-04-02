import { vendorItemMessageLabel } from '../../../lib/buildOrderMessage'
import type { OrderItem, VendorItem } from '../../../types/order'
import type { VendorHistoryOrder } from './vendorData/types'
import { countCatalogItemFrequencyInRecentHistory } from './vendorData/suggestOrderFromHistory'

export type OrderChecklistSortMode = 'alphabetical' | 'frequency'

export function orderedCatalogIdsForChecklist(
  catalog: VendorItem[],
  history: VendorHistoryOrder[],
  mode: OrderChecklistSortMode,
): string[] {
  const cats = [...catalog]
  if (mode === 'alphabetical') {
    cats.sort((a, b) =>
      vendorItemMessageLabel(a).localeCompare(vendorItemMessageLabel(b), undefined, {
        sensitivity: 'base',
      }),
    )
  } else {
    cats.sort((a, b) => {
      const fa = countCatalogItemFrequencyInRecentHistory(a, history)
      const fb = countCatalogItemFrequencyInRecentHistory(b, history)
      if (fb !== fa) return fb - fa
      return vendorItemMessageLabel(a).localeCompare(vendorItemMessageLabel(b), undefined, {
        sensitivity: 'base',
      })
    })
  }
  return cats.map((c) => c.id)
}

/** Reorders draft lines to match catalog sort; unknown ids append at the end. */
export function sortOrderItemsByCatalogOrder(
  items: OrderItem[],
  catalogIdsOrdered: string[],
): OrderItem[] {
  const byId = new Map(items.map((r) => [r.vendorItemId, r]))
  const ordered: OrderItem[] = []
  for (const id of catalogIdsOrdered) {
    const row = byId.get(id)
    if (row) ordered.push(row)
  }
  for (const row of items) {
    if (!catalogIdsOrdered.includes(row.vendorItemId)) ordered.push(row)
  }
  return ordered
}
