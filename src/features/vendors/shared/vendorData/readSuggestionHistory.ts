import type { VendorHistoryOrder, VendorRichHistoryEntry } from './types'

/**
 * Shared suggestion source merger:
 * - seed/imported history
 * - app-finalized history
 *
 * Result is chronological (newest first) and ready for suggestion reads.
 */
export function mergeSuggestionHistory(
  seedOrders: VendorHistoryOrder[],
  appFinalized: VendorRichHistoryEntry[],
): VendorHistoryOrder[] {
  const appOrders: VendorHistoryOrder[] = appFinalized
    .filter((e) => e.items.length > 0)
    .map((e) => ({
      date: e.orderDate || new Date(e.sentAt).toISOString().slice(0, 10),
      deliveryDate: e.deliveryDate,
      items: e.items,
    }))

  return [...appOrders, ...seedOrders].sort((a, b) =>
    b.date.localeCompare(a.date),
  )
}
