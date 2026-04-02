/** One row in local order history (append-only on mark sent). */
export interface OrderHistoryEntry {
  sentAt: number
  /** ISO delivery date from draft at send time */
  deliveryDate: string
  lineCount: number
  /** Short preview for list rows */
  preview: string
}
