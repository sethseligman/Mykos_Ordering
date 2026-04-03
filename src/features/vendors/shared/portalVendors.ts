import { dartagnanPlatformConfig } from '../dartagnan/dartagnanVendorConfig'
import { aceEndicoPlatformConfig } from '../ace-endico/aceEndicoVendorConfig'
import { optimaPlatformConfig } from '../optima/optimaVendorConfig'
import type { VendorPlatformConfig } from './vendorConfig'
import { fetchVendorConfigs } from './vendorQueries'
import { resolveVendorPlatformConfig } from './vendorSettingsStorage'

/** Static registry until vendors load from API or local admin store. */
const basePortalVendors: VendorPlatformConfig[] = [
  dartagnanPlatformConfig,
  aceEndicoPlatformConfig,
  optimaPlatformConfig,
]

// TODO: replace with auth session restaurant ID in Phase 2
const HARDCODED_RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

export function readPortalVendors(): VendorPlatformConfig[] {
  return basePortalVendors.map((v) => resolveVendorPlatformConfig(v))
}

export async function fetchPortalVendors(): Promise<VendorPlatformConfig[]> {
  return fetchVendorConfigs(HARDCODED_RESTAURANT_ID)
}
