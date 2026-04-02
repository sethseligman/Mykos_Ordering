import { dartagnanPlatformConfig } from '../dartagnan/dartagnanVendorConfig'
import { aceEndicoPlatformConfig } from '../ace-endico/aceEndicoVendorConfig'
import { optimaPlatformConfig } from '../optima/optimaVendorConfig'
import type { VendorPlatformConfig } from './vendorConfig'
import { resolveVendorPlatformConfig } from './vendorSettingsStorage'

/** Static registry until vendors load from API or local admin store. */
const basePortalVendors: VendorPlatformConfig[] = [
  dartagnanPlatformConfig,
  aceEndicoPlatformConfig,
  optimaPlatformConfig,
]

export function readPortalVendors(): VendorPlatformConfig[] {
  return basePortalVendors.map((v) => resolveVendorPlatformConfig(v))
}
