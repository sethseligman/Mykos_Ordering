import { buildVendorCatalogFromSheet } from '../shared/vendorData/buildVendorCatalogFromSheet'
import { aceEndicoDryGoodsSheetRows } from './aceEndicoDryGoodsSheet'

/** Master catalog derived from the dry-goods order sheet only. */
export const aceEndicoCatalogItems = buildVendorCatalogFromSheet(
  'ace-endico',
  aceEndicoDryGoodsSheetRows,
)
