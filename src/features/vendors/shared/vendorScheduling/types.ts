export type Weekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

export type InvalidDateStrategy =
  | 'suggest_next_valid_date'
  | 'allow_blank_order'
  | 'block_order'

/** One catalog line minimum for a standing commitment on that delivery weekday. */
export type StandingOrderLineRule = {
  itemId: string
  minimumQuantity: string
  unit: string
}

export type VendorSchedulingRules = {
  vendorId: string
  /** For user-facing validation messages */
  vendorDisplayName: string
  // Days the vendor is actually available to deliver — hard constraint.
  // Selecting a date outside these days should warn the user.
  vendorDeliveryDays: Weekday[]
  // Days this restaurant prefers to receive deliveries — soft preference.
  // Selecting a date outside these days is allowed but noted.
  preferredDeliveryDays: Weekday[]
  /** Optional: shown in copy only (not used to gate delivery-date validation yet). */
  validOrderDays?: Weekday[]
  standingOrderRules?: Partial<Record<Weekday, StandingOrderLineRule[]>>
  invalidDateStrategy: InvalidDateStrategy
}

export type VendorDeliveryDateValidation = {
  isValid: boolean
  /** Null if the date string does not parse. */
  weekday: Weekday | null
  /** Next valid delivery on or after the selected date (only when invalid + strategy requests it). */
  suggestedNextValidDate: string | null
  applyStandingOrders: boolean
  applyHistorySuggestions: boolean
  message?: string
  /** When true, disable generate / send / SMS and optionally lock checklist. */
  blocksPrimaryActions: boolean
}
