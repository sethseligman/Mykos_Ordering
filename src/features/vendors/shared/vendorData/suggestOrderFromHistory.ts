import type { OrderItem, VendorItem } from '../../../../types/order'
import type { VendorHistoryLine, VendorHistoryOrder } from './types'

const RECENT_ORDER_COUNT = 10
const MIN_HITS = 4
const MIN_RATIO = 0.35

function packKey(p?: string): string {
  return (p ?? '').trim()
}

function lineMatchesCatalog(
  line: VendorHistoryLine,
  cat: VendorItem,
): boolean {
  return (
    line.itemId === cat.id &&
    packKey(line.packSizeSnapshot) === packKey(cat.packSize)
  )
}

/** How many of the most recent `recentCount` orders include this catalog line (id + pack). */
export function countCatalogItemFrequencyInRecentHistory(
  cat: VendorItem,
  history: VendorHistoryOrder[],
  recentCount = RECENT_ORDER_COUNT,
): number {
  const recent = [...history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, recentCount)
  let n = 0
  for (const ord of recent) {
    if (ord.items.some((line) => lineMatchesCatalog(line, cat))) n++
  }
  return n
}

function modeQuantity(quantities: string[]): string {
  const counts = new Map<string, number>()
  for (const raw of quantities) {
    const q = raw.trim()
    if (!q) continue
    counts.set(q, (counts.get(q) ?? 0) + 1)
  }
  let best = '1'
  let bestN = 0
  for (const [q, n] of counts) {
    if (n > bestN) {
      best = q
      bestN = n
    }
  }
  return best
}

/**
 * History → suggested `OrderItem[]` for one full pass over the master catalog.
 * Every catalog row appears; only recurring SKUs (id + pack) are checked with a mode qty.
 */
export function generateSuggestedOrderItemsFromHistory(
  history: VendorHistoryOrder[],
  masterCatalog: VendorItem[],
): OrderItem[] {
  const recent = [...history]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_ORDER_COUNT)
  const window = recent.length || 1
  const threshold = Math.max(MIN_HITS, Math.ceil(window * MIN_RATIO))

  return masterCatalog.map((cat) => {
    const hits: string[] = []
    for (const ord of recent) {
      const line = ord.items.find((it) => lineMatchesCatalog(it, cat))
      if (line) hits.push(line.quantity)
    }
    const included = hits.length >= threshold
    const quantity = included ? modeQuantity(hits) : ''
    return {
      vendorItemId: cat.id,
      included,
      quantity,
      unit: cat.unit,
    }
  })
}
