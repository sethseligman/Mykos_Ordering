import { supabase } from '../../../lib'
import type { OrderDraft } from '../../../types/order'

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

export async function saveFinalizedOrderToSupabase(params: {
  supabaseVendorId: string
  draft: OrderDraft
  messageText: string
  channel: 'sms' | 'email' | 'portal' | 'other'
  sentAt: number
}): Promise<void> {
  // Fire-and-forget: localStorage history is source of truth
  try {
    const { error } = await supabase.from('finalized_orders').insert({
      vendor_id: params.supabaseVendorId,
      restaurant_id: RESTAURANT_ID,
      delivery_date: params.draft.deliveryDate,
      items: params.draft,
      message_text: params.messageText,
      sent_at: new Date(params.sentAt).toISOString(),
      channel: params.channel,
    })
    if (error) {
      console.error('saveFinalizedOrderToSupabase:', error.message)
    }
  } catch (err) {
    console.error('saveFinalizedOrderToSupabase:', err)
  }
}

export async function saveExecutionEventToSupabase(params: {
  supabaseVendorId: string
  channel: 'sms' | 'email' | 'portal' | 'other'
  destination: string
  status: 'sent' | 'failed' | 'pending'
  sentAt: number
  notes?: string
}): Promise<void> {
  // Fire-and-forget: localStorage execution log is source of truth
  try {
    const { error } = await supabase.from('execution_log').insert({
      vendor_id: params.supabaseVendorId,
      restaurant_id: RESTAURANT_ID,
      channel: params.channel,
      destination: params.destination,
      status: params.status,
      sent_at: new Date(params.sentAt).toISOString(),
      notes: params.notes ?? null,
    })
    if (error) {
      console.error('saveExecutionEventToSupabase:', error.message)
    }
  } catch (err) {
    console.error('saveExecutionEventToSupabase:', err)
  }
}

type FinalizedOrder = {
  id: string
  vendor_id: string
  restaurant_id: string
  delivery_date: string
  items: unknown
  message_text: string
  sent_at: string
  channel: string
  created_at: string
}

export async function getFinalizedOrdersByVendor(
  vendorId: string,
): Promise<FinalizedOrder[]> {
  const { data, error } = await supabase
    .from('finalized_orders')
    .select(
      'id, vendor_id, restaurant_id, delivery_date, items, message_text, sent_at, channel, created_at',
    )
    .eq('vendor_id', vendorId)
    .eq('restaurant_id', RESTAURANT_ID)
    .order('sent_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as FinalizedOrder[]
}

export async function deleteFinalizedOrder(
  orderId: string,
  vendorId: string,
  sentAt: string,
): Promise<void> {
  const { error: orderError } = await supabase
    .from('finalized_orders')
    .delete()
    .eq('id', orderId)

  if (orderError) throw new Error(orderError.message)

  const { error: logError } = await supabase
    .from('execution_log')
    .delete()
    .eq('vendor_id', vendorId)
    .eq('restaurant_id', RESTAURANT_ID)
    .eq('sent_at', sentAt)

  if (logError) throw new Error(logError.message)
}
