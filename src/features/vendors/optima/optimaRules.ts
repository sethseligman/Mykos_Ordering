/**
 * Optima operational rules (config-driven; UI reads from here).
 * `channelType: "text"` maps to SMS handoff via `Vendor.channelType === "sms"`.
 */
export const optimaRules = {
  deliveryDays: ['Thursday'] as const,
  /** Dry goods sheet: “Order Monday for Thursday” */
  orderDays: ['Monday'] as const,
  /** Outbound channel intent — use SMS in app */
  channelType: 'text' as const,
  allowsAddOns: true,
} as const
