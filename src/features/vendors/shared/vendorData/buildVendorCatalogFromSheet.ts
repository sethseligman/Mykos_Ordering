import type { VendorItem } from '../../../../types/order'
import type { VendorCatalogSheetRow } from './types'

/**
 * Order sheet → master catalog (single source for ids, names, units, optional pack).
 * Future: swap implementation to parse CSV/XLSX while keeping the same output shape.
 */
export function buildVendorCatalogFromSheet(
  _vendorId: string,
  sheetRows: VendorCatalogSheetRow[],
): VendorItem[] {
  return sheetRows.map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unitType,
    packSize: row.packSize,
  }))
}
