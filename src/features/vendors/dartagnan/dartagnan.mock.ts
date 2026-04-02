import type { OrderDraft, Vendor, VendorItem } from '../../../types/order'
import {
  applyStandingOrderRulesToItems,
  defaultDeliveryDateForScheduling,
  validateVendorDeliveryDate,
} from '../shared/vendorScheduling'
import { buildVendorCatalogFromSheet } from '../shared/vendorData/buildVendorCatalogFromSheet'
import { generateSuggestedOrderItemsFromHistory } from '../shared/vendorData/suggestOrderFromHistory'
import { dartagnanPlatformConfig } from './dartagnanVendorConfig'
import { dartagnanMeatOrderSheetRows } from './dartagnanMeatOrderSheet'
import { readDartagnanSuggestionHistory } from './orderHistoryStorage'
import { dartagnanSchedulingRules } from './dartagnanSchedulingRules'

/** Preset row for Tuesday / Friday loaders (catalog ids + qty / inclusion). */
export type DartagnanTemplateRow = {
  vendorItemId: string
  included: boolean
  quantity: string
  /** Omit to use catalog default or prior row unit */
  unit?: string
}

/** Typical Tuesday pull: standing 1 cs lamb racks + core proteins, grounds optional. */
export const dartagnanTuesdayTemplateRows: DartagnanTemplateRow[] = [
  { vendorItemId: 'lamb-racks', included: true, quantity: '1', unit: 'cs' },
  { vendorItemId: 'octopus', included: true, quantity: '3', unit: 'cs' },
  { vendorItemId: 'pork-racks', included: true, quantity: '2', unit: 'racks' },
  { vendorItemId: 'ground-lamb', included: false, quantity: '10', unit: '#' },
  { vendorItemId: 'ground-wagyu', included: false, quantity: '10', unit: '#' },
  { vendorItemId: 'lamb-neck', included: false, quantity: '', unit: 'cs' },
  { vendorItemId: 'duck', included: false, quantity: '', unit: 'cs' },
]

/** Typical Friday pull: standing 2 cs lamb racks + fuller sheet. */
export const dartagnanFridayTemplateRows: DartagnanTemplateRow[] = [
  { vendorItemId: 'lamb-racks', included: true, quantity: '2', unit: 'cs' },
  { vendorItemId: 'octopus', included: true, quantity: '4', unit: 'cs' },
  { vendorItemId: 'pork-racks', included: true, quantity: '4', unit: 'racks' },
  { vendorItemId: 'ground-lamb', included: true, quantity: '20', unit: '#' },
  { vendorItemId: 'ground-wagyu', included: true, quantity: '10', unit: '#' },
  { vendorItemId: 'lamb-neck', included: true, quantity: '1', unit: 'cs' },
  { vendorItemId: 'duck', included: true, quantity: '2', unit: 'cs' },
]

export const dartagnanVendor: Vendor = {
  id: dartagnanPlatformConfig.id,
  name: dartagnanPlatformConfig.settings.profile.displayName,
  repNames: 'Matthew / Anthony',
  primaryRepFirstName: 'Anthony',
  channel: 'text',
  orderDays: 'Tuesday / Friday',
  activeOrderDay: 'Tuesday',
  orderDueDay: 'Sunday',
  deliveryDay: 'Tuesday',
  channelType: 'sms',
  contactValue: dartagnanPlatformConfig.settings.profile.contactValue,
  sendMode: 'native',
}

/** Master catalog from meat order sheet only (history never adds SKUs). */
export const dartagnanVendorItems: VendorItem[] = buildVendorCatalogFromSheet(
  'dartagnan',
  dartagnanMeatOrderSheetRows,
)

export const defaultDartagnanInternalNotes = `American lamb only
No substitutions without approval`

/** Reps selectable on the D’Artagnan order sheet (first name → greeting). */
export const dartagnanRepFirstNameOptions = ['Matthew', 'Anthony'] as const

export function buildInitialDartagnanDraft(): OrderDraft {
  const deliveryDate = defaultDeliveryDateForScheduling(dartagnanSchedulingRules)
  const suggestionHistory = readDartagnanSuggestionHistory(dartagnanVendorItems)
  let items = generateSuggestedOrderItemsFromHistory(
    suggestionHistory,
    dartagnanVendorItems,
  )
  const v = validateVendorDeliveryDate(dartagnanSchedulingRules, deliveryDate)
  if (v.applyStandingOrders && v.weekday) {
    items = applyStandingOrderRulesToItems(
      items,
      v.weekday,
      dartagnanSchedulingRules,
    )
  }
  return {
    vendorId: dartagnanVendor.id,
    deliveryDate,
    repFirstName: dartagnanVendor.primaryRepFirstName,
    internalNotes: defaultDartagnanInternalNotes,
    vendorNotes: '',
    status: 'draft',
    items,
  }
}

/** Fresh draft shape; items = history-based suggestion over full sheet catalog. */
export const initialDartagnanDraft: OrderDraft = buildInitialDartagnanDraft()
