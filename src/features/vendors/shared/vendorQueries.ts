import { supabase } from '../../../lib'
import type { VendorPlatformConfig } from './vendorConfig'

export type SupabaseVendorRow = {
  id: string
  restaurant_id: string
  name: string
  category: string
  rep_name: string
  order_days: string[]
  available_delivery_days: string[]
  preferred_delivery_days: string[]
  order_minimum: number
  order_cutoff_time: string
  order_placement_method: 'sms' | 'email' | 'portal'
  destination: string
  supports_addons: boolean
  supports_standing_orders: boolean
  supports_history_suggestions: boolean
  created_at: string
  updated_at: string
}

/** Fetches raw vendor rows for a single restaurant from Supabase. */
export async function fetchVendors(
  restaurantId: string,
): Promise<SupabaseVendorRow[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .is('archived_at', null)

  if (error) {
    throw new Error(`Failed to fetch vendors for restaurant ${restaurantId}: ${error.message}`)
  }

  return (data ?? []) as SupabaseVendorRow[]
}

/** Maps one raw Supabase vendor row into the existing VendorPlatformConfig shape. */
export function mapSupabaseVendorToConfig(
  row: SupabaseVendorRow,
): VendorPlatformConfig {
  return {
    id: row.id,
    settings: {
      profile: {
        displayName: row.name,
        category: row.category,
        contactValue: row.rep_name,
      },
      orderCadence: {
        orderDays: row.order_days,
        availableDeliveryDays: row.available_delivery_days,
        preferredDeliveryDays: row.preferred_delivery_days,
        orderMinimum: String(row.order_minimum),
        orderCutOffTime: row.order_cutoff_time,
      },
      orderPlacement: {
        method: row.order_placement_method,
        destination: row.destination,
      },
      capabilities: {
        supportsAddOns: row.supports_addons,
        supportsStandingOrders: row.supports_standing_orders,
        supportsHistorySuggestions: row.supports_history_suggestions,
      },
    },
    lastKnownOrderDate: new Date().toISOString().slice(0, 10),
  }
}

/** Fetches vendors for a restaurant and returns mapped VendorPlatformConfig records. */
export async function fetchVendorConfigs(
  restaurantId: string,
): Promise<VendorPlatformConfig[]> {
  const rows = await fetchVendors(restaurantId)
  return rows.map(mapSupabaseVendorToConfig)
}
