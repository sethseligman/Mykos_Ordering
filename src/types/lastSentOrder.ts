/** One line persisted when an order is marked sent (vendor-scoped snapshot). */
export interface LastSentOrderLine {
  vendorItemId: string
  included: boolean
  quantity: string
  unit: string
}

export interface LastSentOrderSnapshot {
  vendorId: string
  /** When this snapshot was recorded */
  sentAt: number
  lines: LastSentOrderLine[]
}
