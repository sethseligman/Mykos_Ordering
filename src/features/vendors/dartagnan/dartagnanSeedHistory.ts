import type { VendorHistoryOrder } from '../shared/vendorData/types'
import { buildVendorHistoryFromSource } from '../shared/vendorData/buildVendorHistoryFromSource'

/**
 * Parsed from exported SMS PDF “MYKOS x D’Artagnan” (Mykos ↔ rep).
 * `date` = outbound order message (ISO). `deliveryDate` = stated delivery (ISO);
 * Feb 22 order uses Wed 2/25 per vendor weather delay in-thread.
 * Ground lines normalized to `#` qty from cs/(10#)/(20#) wording.
 */
const dartagnanMeatOrderHistoryRaw: VendorHistoryOrder[] = [
  {
    date: '2026-01-11',
    deliveryDate: '2026-01-13',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'ground-wagyu', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '2', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '2', unitType: 'racks' },
      { itemId: 'duck', quantity: '1', unitType: 'cs' },
    ],
  },
  {
    date: '2026-01-24',
    deliveryDate: '2026-01-27',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'ground-wagyu', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
      { itemId: 'ground-lamb', quantity: '10', unitType: '#' },
    ],
  },
  {
    date: '2026-01-29',
    deliveryDate: '2026-01-30',
    items: [
      { itemId: 'lamb-racks', quantity: '2', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '3', unitType: 'racks' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
    ],
  },
  {
    date: '2026-02-01',
    deliveryDate: '2026-02-03',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'ground-wagyu', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
    ],
  },
  {
    date: '2026-02-05',
    deliveryDate: '2026-02-06',
    items: [
      { itemId: 'lamb-racks', quantity: '2', unitType: 'cs' },
      { itemId: 'ground-lamb', quantity: '10', unitType: '#' },
      { itemId: 'pork-racks', quantity: '1', unitType: 'racks' },
      { itemId: 'octopus', quantity: '2', unitType: 'cs' },
    ],
  },
  {
    date: '2026-02-12',
    deliveryDate: '2026-02-13',
    items: [{ itemId: 'lamb-racks', quantity: '2', unitType: 'cs' }],
  },
  {
    date: '2026-02-15',
    deliveryDate: '2026-02-17',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'octopus', quantity: '4', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '1', unitType: 'racks' },
    ],
  },
  {
    date: '2026-02-19',
    deliveryDate: '2026-02-20',
    items: [
      { itemId: 'lamb-racks', quantity: '2', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '2', unitType: 'racks' },
      { itemId: 'octopus', quantity: '2', unitType: 'cs' },
      { itemId: 'ground-lamb', quantity: '10', unitType: '#' },
    ],
  },
  {
    date: '2026-02-22',
    deliveryDate: '2026-02-25',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '2', unitType: 'racks' },
    ],
  },
  {
    date: '2026-02-26',
    deliveryDate: '2026-02-27',
    items: [
      { itemId: 'lamb-racks', quantity: '2', unitType: 'cs' },
      { itemId: 'ground-wagyu', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '2', unitType: 'racks' },
    ],
  },
  {
    date: '2026-03-01',
    deliveryDate: '2026-03-03',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'ground-lamb', quantity: '10', unitType: '#' },
      { itemId: 'ground-wagyu', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '1', unitType: 'racks' },
    ],
  },
  {
    date: '2026-03-05',
    deliveryDate: '2026-03-06',
    items: [
      { itemId: 'lamb-racks', quantity: '2', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '3', unitType: 'racks' },
    ],
  },
  {
    date: '2026-03-08',
    deliveryDate: '2026-03-10',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'ground-lamb', quantity: '10', unitType: '#' },
      { itemId: 'ground-wagyu', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
    ],
  },
  {
    date: '2026-03-12',
    deliveryDate: '2026-03-13',
    items: [
      { itemId: 'lamb-racks', quantity: '3', unitType: 'cs' },
      { itemId: 'ground-lamb', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '4', unitType: 'racks' },
    ],
  },
  {
    date: '2026-03-15',
    deliveryDate: '2026-03-17',
    items: [
      { itemId: 'lamb-racks', quantity: '2', unitType: 'cs' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
    ],
  },
  {
    date: '2026-03-19',
    deliveryDate: '2026-03-20',
    items: [
      { itemId: 'lamb-racks', quantity: '2', unitType: 'cs' },
      { itemId: 'octopus', quantity: '2', unitType: 'cs' },
    ],
  },
  {
    date: '2026-03-22',
    deliveryDate: '2026-03-24',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'ground-lamb', quantity: '20', unitType: '#' },
      { itemId: 'ground-wagyu', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '2', unitType: 'cs' },
    ],
  },
  {
    date: '2026-03-26',
    deliveryDate: '2026-03-27',
    items: [
      { itemId: 'lamb-racks', quantity: '3', unitType: 'cs' },
      { itemId: 'ground-lamb', quantity: '10', unitType: '#' },
      { itemId: 'octopus', quantity: '1', unitType: 'cs' },
      { itemId: 'pork-racks', quantity: '2', unitType: 'racks' },
      { itemId: 'toro', quantity: '10', unitType: '#' },
    ],
  },
  {
    date: '2026-03-29',
    deliveryDate: '2026-03-31',
    items: [
      { itemId: 'lamb-racks', quantity: '1', unitType: 'cs' },
      { itemId: 'octopus', quantity: '3', unitType: 'cs' },
      { itemId: 'ground-wagyu', quantity: '20', unitType: '#' },
    ],
  },
]

/**
 * Normalized D’Artagnan order history for suggestions (and future imports).
 */
export const dartagnanOrderHistory = buildVendorHistoryFromSource(
  'dartagnan',
  { kind: 'structured_orders', orders: dartagnanMeatOrderHistoryRaw },
)
