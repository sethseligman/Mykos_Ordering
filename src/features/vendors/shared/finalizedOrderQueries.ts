import { supabase } from '../../../lib'
import type { OrderDraft } from '../../../types/order'

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

export async function saveFinalizedOrderToSupabase(params: {
  supabaseVendorId: string
  draft: OrderDraft
  messageText: string
  channel: 'sms' | 'email' | 'portal'
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
  channel: 'sms' | 'email' | 'portal'
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
