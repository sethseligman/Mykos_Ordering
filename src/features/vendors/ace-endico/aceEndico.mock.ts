import type { OrderDraft } from '../../../types/order'
import { defaultDeliveryDateForScheduling } from '../shared/vendorScheduling'
import { aceEndicoCatalogItems } from './aceEndicoCatalog'
import { readAceEndicoSuggestionHistory } from './aceEndicoOrderHistoryStorage'
import { aceEndicoPlatformConfig } from './aceEndicoVendorConfig'
import { aceEndicoVendor } from './aceEndicoVendor'
import { generateAceEndicoSuggestedOrder } from './aceEndicoSuggestion'
import { aceEndicoSchedulingRulesFromSettings } from './aceEndicoSchedulingRules'

export function buildInitialAceEndicoDraft(): OrderDraft {
  const deliveryDate = defaultDeliveryDateForScheduling(
    aceEndicoSchedulingRulesFromSettings(),
  )
  const suggestionHistory = readAceEndicoSuggestionHistory(aceEndicoCatalogItems)
  const items = generateAceEndicoSuggestedOrder(
    suggestionHistory,
    aceEndicoCatalogItems,
  )
  return {
    vendorId: aceEndicoPlatformConfig.id,
    deliveryDate,
    repFirstName: aceEndicoVendor.primaryRepFirstName,
    internalNotes: aceEndicoRulesNote(),
    vendorNotes: '',
    status: 'draft',
    items,
  }
}

function aceEndicoRulesNote(): string {
  return 'Add-ons OK when in stock (per vendor rules).'
}

export { aceEndicoVendor } from './aceEndicoVendor'
