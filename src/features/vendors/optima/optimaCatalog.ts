import { buildVendorCatalogFromSheet } from '../shared/vendorData/buildVendorCatalogFromSheet'
import { optimaDryGoodsSheetRows } from './optimaDryGoodsSheet'

/** Master catalog derived from the dry-goods order sheet only. */
export const optimaCatalogItems = buildVendorCatalogFromSheet(
  'optima',
  optimaDryGoodsSheetRows,
)
