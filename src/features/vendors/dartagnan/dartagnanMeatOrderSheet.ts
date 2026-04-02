import type { VendorCatalogSheetRow } from '../shared/vendorData/types'

/**
 * D’Artagnan master meat order sheet — sole source for catalog ids / labels.
 */
export const dartagnanMeatOrderSheetRows: VendorCatalogSheetRow[] = [
  { id: 'lamb-racks', name: 'Lamb Racks', unitType: 'cs' },
  { id: 'octopus', name: 'Octopus', unitType: 'cs' },
  { id: 'pork-racks', name: 'Pork Racks', unitType: 'racks' },
  { id: 'ground-lamb', name: 'Ground Lamb', unitType: '#' },
  { id: 'ground-wagyu', name: 'Ground Wagyu', unitType: '#' },
  { id: 'lamb-neck', name: 'Lamb Neck', unitType: 'cs' },
  { id: 'duck', name: 'Duck', unitType: 'cs' },
  /** SMS add-on (bluefin toro by #); not on static meat PDF */
  { id: 'toro', name: 'Toro', unitType: '#' },
]
