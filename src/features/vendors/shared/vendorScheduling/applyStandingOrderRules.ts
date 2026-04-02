import type { OrderItem } from '../../../../types/order'
import type { VendorSchedulingRules, Weekday } from './types'

/**
 * Merge standing minimums for `weekday` into `items` (delivery day must already be valid).
 */
export function applyStandingOrderRulesToItems(
  items: OrderItem[],
  weekday: Weekday,
  rules: VendorSchedulingRules,
): OrderItem[] {
  const lineRules = rules.standingOrderRules?.[weekday]
  if (!lineRules?.length) return items

  let next = items
  for (const rule of lineRules) {
    next = next.map((row) => {
      if (row.vendorItemId !== rule.itemId) return row
      const cur = parseInt(row.quantity.trim(), 10)
      const curN = Number.isFinite(cur) ? cur : 0
      const min = parseInt(rule.minimumQuantity.trim(), 10)
      const minN = Number.isFinite(min) ? min : 0
      const nextN = Math.max(curN, minN)
      return {
        ...row,
        included: true,
        quantity: String(nextN),
        unit: row.unit.trim() ? row.unit : rule.unit,
      }
    })
  }
  return next
}
