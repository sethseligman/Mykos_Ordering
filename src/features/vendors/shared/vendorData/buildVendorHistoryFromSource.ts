import type { VendorHistoryOrder } from './types'

/**
 * Input shapes for turning external data into structured order history.
 * `structured_orders` = already normalized (seed, DB export).
 * `message_archive` = stub for future SMS/email parsing (returns [] until implemented).
 */
export type VendorHistorySource =
  | { kind: 'structured_orders'; orders: VendorHistoryOrder[] }
  | { kind: 'message_archive'; rawMessages: string[] }

/**
 * Messages / exports / archives → structured history used only for suggestions
 * (never expands the master catalog).
 */
export function buildVendorHistoryFromSource(
  vendorId: string,
  source: VendorHistorySource,
): VendorHistoryOrder[] {
  if (source.kind === 'structured_orders') return source.orders
  if (source.kind === 'message_archive') {
    void vendorId
    void source.rawMessages
    return []
  }
  return []
}
