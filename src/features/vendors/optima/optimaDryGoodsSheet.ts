import type { VendorCatalogSheetRow } from '../shared/vendorData/types'

/**
 * Optima section from the Dry Goods order PDF (Optima–Lacavos; week starting 3/30/26).
 * Unit types are inferred where the PDF does not list a Unit Spec per row; adjust when you wire real specs.
 * Two Spanakopita SKUs: separate rows (2x12 vs 2x40) — packSize optional metadata, not in display name.
 */
export const optimaDryGoodsSheetRows: VendorCatalogSheetRow[] = [
  { id: 'honey-monastiri-crete', name: 'Honey - Monastiri Crete', unitType: 'case' },
  { id: 'beans-voion-giant', name: 'Beans - Voion Giant', unitType: 'case' },
  { id: 'caviar-carp-krinos', name: 'Caviar Carp - Krinos', unitType: 'case' },
  { id: 'cod-roe-big-bag', name: 'Cod Roe - Big Bag', unitType: 'case' },
  { id: 'feta-epiros', name: 'Feta - epiros', unitType: 'tub' },
  { id: 'fillo-zimi', name: 'Fillo - Zimi', unitType: 'case' },
  { id: 'halloumi-cypriana', name: 'Halloumi - Cypriana', unitType: 'case' },
  { id: 'kataifi-zimi', name: 'Kataifi - Zimi', unitType: 'case' },
  { id: 'kefalograviera', name: 'Kefalograviera', unitType: 'wheel' },
  { id: 'manouri-hotos', name: 'Manouri - Hotos', unitType: 'tub' },
  { id: 'oregano-dried-etaygetos', name: 'Oregano, Dried - Etaygetos', unitType: 'case' },
  { id: 'orzo-misko', name: 'Orzo - Misko', unitType: 'bag' },
  { id: 'sausage-loukaniko', name: 'Sausage - Loukaniko', unitType: 'case' },
  { id: 'sour-cherries-pella', name: 'Sour Cherries - Pella', unitType: 'case' },
  {
    id: 'spanakopita-domnas-2x12',
    name: 'Spanakopita - Domnas',
    unitType: 'case',
    packSize: '2x12',
  },
  {
    id: 'spanakopita-domnas-2x40',
    name: 'Spanakopita - Domnas',
    unitType: 'case',
    packSize: '2x40',
  },
  { id: 'water-sparkling', name: 'Water - Sparkling', unitType: 'case' },
  { id: 'water-still', name: 'Water - Still', unitType: 'case' },
  { id: 'yogurt-triple-cream', name: 'Yogurt - Triple Cream', unitType: 'each' },
  /** Chat orders reference Iliada 4×3 specifically */
  {
    id: 'evoo-iliada-4x3',
    name: 'EVOO - Iliada',
    unitType: 'case',
    packSize: '4x3',
  },
  { id: 'evoo', name: 'EVOO', unitType: 'case' },
  /** Add-on in SMS thread; not on dry-goods sheet PDF */
  {
    id: 'kalamata-olives-pitted',
    name: 'Kalamata olives pitted (large)',
    unitType: 'tub',
  },
]
