import { supabase } from '../../../lib'
import type { OrderDraft, OrderItem, OrderStatus } from '../../../types/order'

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

const ORDER_STATUSES: OrderStatus[] = ['draft', 'ready', 'sent']

export type SupabaseDraftRow = {
  id: string
  vendor_id: string
  restaurant_id: string
  delivery_date: string
  items: unknown
  created_at: string
  updated_at: string
}

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && (ORDER_STATUSES as string[]).includes(value)
}

function isOrderItem(value: unknown): value is OrderItem {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  if (typeof o.vendorItemId !== 'string') return false
  if (typeof o.included !== 'boolean') return false
  if (typeof o.quantity !== 'string') return false
  if (typeof o.unit !== 'string') return false
  if (o.lastQuantity !== undefined && typeof o.lastQuantity !== 'string') return false
  if (o.lastUnit !== undefined && typeof o.lastUnit !== 'string') return false
  return true
}

/** Safely parses the JSONB `items` column (full OrderDraft payload) into an OrderDraft, or null if invalid. */
export function parseDraftFromRow(row: SupabaseDraftRow): OrderDraft | null {
  const raw = row.items
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null

  const obj = raw as Record<string, unknown>

  if (typeof obj.vendorId !== 'string') return null
  if (typeof obj.deliveryDate !== 'string') return null
  if (typeof obj.repFirstName !== 'string') return null
  if (typeof obj.internalNotes !== 'string') return null
  if (typeof obj.vendorNotes !== 'string') return null
  if (!isOrderStatus(obj.status)) return null
  if (!Array.isArray(obj.items)) return null
  if (!obj.items.every(isOrderItem)) return null

  return {
    vendorId: obj.vendorId,
    deliveryDate: obj.deliveryDate,
    repFirstName: obj.repFirstName,
    items: obj.items,
    internalNotes: obj.internalNotes,
    vendorNotes: obj.vendorNotes,
    status: obj.status,
  }
}

/** Persists the draft to Supabase for this vendor and restaurant; failures are logged only. */
export async function saveDraftToSupabase(
  vendorId: string,
  draft: OrderDraft,
): Promise<void> {
  // Fire-and-forget: localStorage is source of truth
  try {
    const { error } = await supabase
      .from('order_drafts')
      .upsert(
        {
          vendor_id: vendorId,
          restaurant_id: RESTAURANT_ID,
          delivery_date: draft.deliveryDate,
          items: draft,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'vendor_id,restaurant_id',
        },
      )

    if (error) {
      console.error('saveDraftToSupabase: upsert failed', error.message)
    }
  } catch (err) {
    console.error('saveDraftToSupabase: unexpected error', err)
  }
}

/** Loads the most recently updated draft for this vendor and restaurant from Supabase, or null. */
export async function loadDraftFromSupabase(
  vendorId: string,
): Promise<OrderDraft | null> {
  try {
    const { data, error } = await supabase
      .from('order_drafts')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('restaurant_id', RESTAURANT_ID)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('loadDraftFromSupabase: query failed', error.message)
      return null
    }

    if (!data) return null

    const parsed = parseDraftFromRow(data as SupabaseDraftRow)
    if (!parsed) {
      console.error('loadDraftFromSupabase: invalid draft payload in row')
    }
    return parsed
  } catch (err) {
    console.error('loadDraftFromSupabase: unexpected error', err)
    return null
  }
}

/** Same as {@link loadDraftFromSupabase} but includes `updated_at` for cross-device recency checks. Never throws. */
export async function loadDraftWithTimestampFromSupabase(
  vendorId: string,
): Promise<{ draft: OrderDraft; updatedAt: string } | null> {
  try {
    const { data, error } = await supabase
      .from('order_drafts')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('restaurant_id', RESTAURANT_ID)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(
        'loadDraftWithTimestampFromSupabase: query failed',
        error.message,
      )
      return null
    }

    if (!data) return null

    const row = data as SupabaseDraftRow
    const parsed = parseDraftFromRow(row)
    if (!parsed) {
      console.error(
        'loadDraftWithTimestampFromSupabase: invalid draft payload in row',
      )
      return null
    }
    return { draft: parsed, updatedAt: row.updated_at }
  } catch (err) {
    console.error('loadDraftWithTimestampFromSupabase: unexpected error', err)
    return null
  }
}
