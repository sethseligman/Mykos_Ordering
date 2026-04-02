import type { OrderDraft } from '../../../types/order'
import { defaultDeliveryDateForScheduling } from '../shared/vendorScheduling'
import { optimaCatalogItems } from './optimaCatalog'
import { readOptimaSuggestionHistory } from './optimaOrderHistoryStorage'
import { optimaPlatformConfig } from './optimaVendorConfig'
import { optimaVendor } from './optimaVendor'
import { generateOptimaSuggestedOrder } from './optimaSuggestion'
import { optimaSchedulingRules } from './optimaSchedulingRules'

export function buildInitialOptimaDraft(): OrderDraft {
  const deliveryDate = defaultDeliveryDateForScheduling(optimaSchedulingRules)
  const suggestionHistory = readOptimaSuggestionHistory(optimaCatalogItems)
  const items = generateOptimaSuggestedOrder(
    suggestionHistory,
    optimaCatalogItems,
  )
  return {
    vendorId: optimaPlatformConfig.id,
    deliveryDate,
    repFirstName: optimaVendor.primaryRepFirstName,
    internalNotes: optimaRulesNote(),
    vendorNotes: '',
    status: 'draft',
    items,
  }
}

function optimaRulesNote(): string {
  return 'Add-ons OK when in stock (per vendor rules).'
}

export { optimaVendor } from './optimaVendor'
