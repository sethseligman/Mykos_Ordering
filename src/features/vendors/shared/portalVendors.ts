import type { VendorPlatformConfig } from './vendorConfig'
import { fetchVendorConfigs } from './vendorQueries'
 
// TODO: replace with auth session restaurant ID in Phase 3
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

export function readPortalVendors(): VendorPlatformConfig[] {
  return []
}

export async function fetchPortalVendors(): Promise<VendorPlatformConfig[]> {
  return fetchVendorConfigs(RESTAURANT_ID)
}
