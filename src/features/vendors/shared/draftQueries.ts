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

function coerceOrderItem(value: unknown): OrderItem | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const o = value as Record<string, unknown>
  if (typeof o.vendorItemId !== 'string' || !o.vendorItemId) return null
  if (typeof o.included !== 'boolean') return null

  const quantity =
    typeof o.quantity === 'string'
      ? o.quantity
      : o.quantity != null
        ? String(o.quantity)
        : ''
  const unit =
    typeof o.unit === 'string' ? o.unit : o.unit != null ? String(o.unit) : ''

  const item: OrderItem = {
    vendorItemId: o.vendorItemId,
    included: o.included,
    quantity,
    unit,
  }
  if (typeof o.lastQuantity === 'string') item.lastQuantity = o.lastQuantity
  if (typeof o.lastUnit === 'string') item.lastUnit = o.lastUnit
  return item
}

/** Ensures persisted JSONB includes every field {@link parseDraftFromRow} expects. */
function normalizeDraftForStorage(draft: OrderDraft): OrderDraft {
  return {
    vendorId: draft.vendorId,
    deliveryDate: draft.deliveryDate,
    repFirstName: draft.repFirstName ?? '',
    internalNotes: draft.internalNotes ?? '',
    vendorNotes: draft.vendorNotes ?? '',
    status: isOrderStatus(draft.status) ? draft.status : 'draft',
    items: draft.items.map((row) => ({
      vendorItemId: row.vendorItemId,
      included: row.included,
      quantity: row.quantity ?? '',
      unit: row.unit ?? '',
      ...(row.lastQuantity !== undefined
        ? { lastQuantity: row.lastQuantity }
        : {}),
      ...(row.lastUnit !== undefined ? { lastUnit: row.lastUnit } : {}),
    })),
  }
}

/** Safely parses the JSONB `items` column (full OrderDraft payload) into an OrderDraft, or null if invalid. */
export function parseDraftFromRow(row: SupabaseDraftRow): OrderDraft | null {
  const raw = row.items
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn('parseDraftFromRow: items column is not an object')
    return null
  }

  const obj = raw as Record<string, unknown>
  const missingCritical: string[] = []

  if (typeof obj.vendorId !== 'string' || !obj.vendorId) {
    missingCritical.push('vendorId')
  }
  if (typeof obj.deliveryDate !== 'string' || !obj.deliveryDate) {
    missingCritical.push('deliveryDate')
  }
  if (!Array.isArray(obj.items)) {
    missingCritical.push('items')
  }

  if (missingCritical.length > 0) {
    console.warn(
      'parseDraftFromRow: missing critical fields',
      missingCritical,
    )
    return null
  }

  const lineItems = (obj.items as unknown[])
    .map(coerceOrderItem)
    .filter((item): item is OrderItem => item != null)

  if (lineItems.length < (obj.items as unknown[]).length) {
    console.warn(
      'parseDraftFromRow: dropped invalid line items',
      (obj.items as unknown[]).length - lineItems.length,
    )
  }

  if (typeof obj.repFirstName !== 'string') {
    console.warn('parseDraftFromRow: repFirstName missing, defaulting to ""')
  }
  if (typeof obj.internalNotes !== 'string') {
    console.warn('parseDraftFromRow: internalNotes missing, defaulting to ""')
  }
  if (typeof obj.vendorNotes !== 'string') {
    console.warn('parseDraftFromRow: vendorNotes missing, defaulting to ""')
  }
  if (!isOrderStatus(obj.status)) {
    console.warn('parseDraftFromRow: status invalid, defaulting to draft')
  }

  return {
    vendorId: obj.vendorId as string,
    deliveryDate: obj.deliveryDate as string,
    repFirstName:
      typeof obj.repFirstName === 'string' ? obj.repFirstName : '',
    items: lineItems,
    internalNotes:
      typeof obj.internalNotes === 'string' ? obj.internalNotes : '',
    vendorNotes: typeof obj.vendorNotes === 'string' ? obj.vendorNotes : '',
    status: isOrderStatus(obj.status) ? obj.status : 'draft',
  }
}

/** Persists the draft to Supabase for this vendor and restaurant; failures are logged only. */
export async function saveDraftToSupabase(
  vendorId: string,
  draft: OrderDraft,
): Promise<void> {
  // Fire-and-forget: localStorage is source of truth
  try {
    const payload = normalizeDraftForStorage(draft)
    const { error } = await supabase
      .from('order_drafts')
      .upsert(
        {
          vendor_id: vendorId,
          restaurant_id: RESTAURANT_ID,
          delivery_date: payload.deliveryDate,
          items: payload,
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

    if (error) {
      console.error('loadDraftFromSupabase: query failed', error.message)
      return null
    }

    const row = data?.[0] as SupabaseDraftRow | undefined
    if (!row) return null

    const parsed = parseDraftFromRow(row)
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

    if (error) {
      console.error(
        'loadDraftWithTimestampFromSupabase: query failed',
        error.message,
      )
      return null
    }

    const row = data?.[0] as SupabaseDraftRow | undefined
    if (!row) return null

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
