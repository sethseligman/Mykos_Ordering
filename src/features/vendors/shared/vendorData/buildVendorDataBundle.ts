import type { VendorCatalogSheetRow, VendorHistoryOrder } from './types'
import { buildVendorCatalogFromSheet } from './buildVendorCatalogFromSheet'
import { generateSuggestedOrderItemsFromHistory } from './suggestOrderFromHistory'

/**
 * Convenience: sheet rows + history orders → catalog + suggested line items.
 */
export function buildVendorDataBundle(
  vendorId: string,
  sheetRows: VendorCatalogSheetRow[],
  historyOrders: VendorHistoryOrder[],
) {
  const masterCatalog = buildVendorCatalogFromSheet(vendorId, sheetRows)
  const suggestedItems = generateSuggestedOrderItemsFromHistory(
    historyOrders,
    masterCatalog,
  )
  return {
    vendorId,
    masterCatalog,
    history: historyOrders,
    suggestedItems,
  }
}
