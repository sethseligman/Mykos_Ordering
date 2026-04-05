/** How orders are sent to this vendor (extensible for email, portal, other channels, etc.) */
export type OrderChannel = 'text' | 'email' | 'phone' | 'portal' | 'other'
export type VendorChannelType = 'sms' | 'email'
export type VendorSendMode = 'native' | 'manual'

/** Lifecycle for a single order sheet (local only for MVP) */
export type OrderStatus = 'draft' | 'ready' | 'sent'

export interface Vendor {
  id: string
  name: string
  /** e.g. "Matthew / Anthony" */
  repNames: string
  /** First name used in generated message greeting */
  primaryRepFirstName: string
  channel: OrderChannel
  /** e.g. "Tuesday / Friday" */
  orderDays: string
  /** Which order day this draft is for (message body) */
  activeOrderDay: string
  /** Day this vendor order should be placed */
  orderDueDay: string
  /** Delivery day tied to the order cycle */
  deliveryDay: string
  /** How this vendor should be contacted for outbound order text */
  channelType: VendorChannelType
  /** Target recipient (phone number/email/etc.) */
  contactValue: string
  /** Native app handoff vs manual copy flow */
  sendMode: VendorSendMode
}

/** Catalog line for a vendor (reusable across orders) */
export interface VendorItem {
  id: string
  name: string
  /** Shown in the unit column (cs, racks, case, each, …) */
  unit: string
  /** Optional pack label (e.g. "2x12") — not part of `name`; used in UI + outbound text */
  packSize?: string
}

/** One line on the clipboard for this draft */
export interface OrderItem {
  vendorItemId: string
  included: boolean
  /** Freeform qty for MVP (e.g. "2", "10") */
  quantity: string
  /** Copied from vendor catalog; editable per row for odd cases */
  unit: string
  /** Previous order context, display-only */
  lastQuantity?: string
  /** Previous order context unit (cs, #, racks, …), display-only */
  lastUnit?: string
}

export interface OrderDraft {
  vendorId: string
  /** ISO date string YYYY-MM-DD (date input–friendly) */
  deliveryDate: string
  /** Active rep for this draft (greeting + metadata); options are vendor-specific in UI */
  repFirstName: string
  items: OrderItem[]
  /** Kitchen / ops — shown on screen, not sent in the vendor message */
  internalNotes: string
  /** Sent in the generated text when non-empty */
  vendorNotes: string
  status: OrderStatus
}
