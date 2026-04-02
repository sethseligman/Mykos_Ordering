import type { OrderItem, VendorItem } from '../../../../types/order'

/**
 * One row on the master order sheet (source of truth for catalog ids and labels).
 * `unitType` becomes `VendorItem.unit`; `packSize` stays optional metadata.
 */
export type VendorCatalogSheetRow = {
  id: string
  name: string
  unitType: string
  packSize?: string
}

/** One line in a past order (messages / exports / structured import). */
export type VendorHistoryLine = {
  itemId: string
  quantity: string
  unitType: string
  packSizeSnapshot?: string
}

export type VendorHistoryOrder = {
  date: string
  deliveryDate: string
  items: VendorHistoryLine[]
}

/** One order row in History tab UI (seed, app, or legacy compact). */
export type VendorRichHistoryEntry = {
  sentAt: number
  orderDate: string
  deliveryDate: string
  items: VendorHistoryLine[]
  preview: string
  source: 'seed' | 'app'
}

/** Full master list + past orders + suggested line items for a draft row. */
export type VendorDataBundle = {
  vendorId: string
  masterCatalog: VendorItem[]
  history: VendorHistoryOrder[]
  suggestedItems: OrderItem[]
}
