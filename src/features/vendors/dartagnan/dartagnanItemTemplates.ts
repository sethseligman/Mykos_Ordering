import {
  type DartagnanTemplateRow,
  dartagnanFridayTemplateRows,
  dartagnanTuesdayTemplateRows,
} from './dartagnan.mock'
import type { LastSentOrderSnapshot } from '../../../types/lastSentOrder'
import type { OrderItem, VendorItem } from '../../../types/order'

function templateMap(rows: DartagnanTemplateRow[]): Map<string, DartagnanTemplateRow> {
  return new Map(rows.map((r) => [r.vendorItemId, r]))
}

function attachLastContext(
  items: OrderItem[],
  previousItems: OrderItem[],
): OrderItem[] {
  const prev = new Map(previousItems.map((r) => [r.vendorItemId, r]))
  return items.map((row) => {
    const prior = prev.get(row.vendorItemId)
    return {
      ...row,
      lastQuantity: prior?.lastQuantity,
      lastUnit: prior?.lastUnit,
    }
  })
}

function applyTemplateRows(
  catalog: VendorItem[],
  previousItems: OrderItem[],
  rows: Map<string, DartagnanTemplateRow>,
): OrderItem[] {
  const prev = new Map(previousItems.map((r) => [r.vendorItemId, r]))
  const core: OrderItem[] = catalog.map((cat) => {
    const t = rows.get(cat.id)
    const prior = prev.get(cat.id)
    if (!t) {
      return {
        vendorItemId: cat.id,
        included: false,
        quantity: '',
        unit: prior?.unit?.trim() ? prior.unit : cat.unit,
      }
    }
    return {
      vendorItemId: cat.id,
      included: t.included,
      quantity: t.quantity,
      unit: t.unit ?? (prior?.unit?.trim() ? prior.unit : cat.unit),
    }
  })
  return attachLastContext(core, previousItems)
}

export function buildTuesdayTemplate(
  catalog: VendorItem[],
  previousItems: OrderItem[],
): OrderItem[] {
  return applyTemplateRows(
    catalog,
    previousItems,
    templateMap(dartagnanTuesdayTemplateRows),
  )
}

export function buildFridayTemplate(
  catalog: VendorItem[],
  previousItems: OrderItem[],
): OrderItem[] {
  return applyTemplateRows(
    catalog,
    previousItems,
    templateMap(dartagnanFridayTemplateRows),
  )
}

export function buildLastOrderTemplate(
  catalog: VendorItem[],
  previousItems: OrderItem[],
  lastSentSnapshot: LastSentOrderSnapshot | null,
): OrderItem[] {
  if (lastSentSnapshot?.lines?.length) {
    const snapMap = new Map(
      lastSentSnapshot.lines.map((l) => [l.vendorItemId, l]),
    )
    const prev = new Map(previousItems.map((r) => [r.vendorItemId, r]))
    const core: OrderItem[] = catalog.map((cat) => {
      const line = snapMap.get(cat.id)
      const prior = prev.get(cat.id)
      if (!line) {
        return {
          vendorItemId: cat.id,
          included: false,
          quantity: '',
          unit: prior?.unit?.trim() ? prior.unit : cat.unit,
        }
      }
      return {
        vendorItemId: cat.id,
        included: line.included,
        quantity: line.quantity,
        unit: line.unit?.trim()
          ? line.unit
          : prior?.unit?.trim()
            ? prior.unit
            : cat.unit,
      }
    })
    return core.map((row) => {
      const line = snapMap.get(row.vendorItemId)
      if (!line) {
        return {
          ...row,
          lastQuantity: '',
          lastUnit: row.unit,
        }
      }
      return {
        ...row,
        lastQuantity: line.included ? line.quantity : '',
        lastUnit: line.unit?.trim() ? line.unit : row.unit,
      }
    })
  }

  const prev = new Map(previousItems.map((r) => [r.vendorItemId, r]))
  const core: OrderItem[] = catalog.map((cat) => {
    const prior = prev.get(cat.id)
    const lastQ = prior?.lastQuantity?.trim() ?? ''
    if (lastQ) {
      const lastU = prior?.lastUnit?.trim()
      return {
        vendorItemId: cat.id,
        included: true,
        quantity: lastQ,
        unit: lastU || cat.unit,
      }
    }
    return {
      vendorItemId: cat.id,
      included: false,
      quantity: '',
      unit: prior?.unit?.trim() ? prior.unit : cat.unit,
    }
  })
  return attachLastContext(core, previousItems)
}

export function buildEmptyTemplate(
  catalog: VendorItem[],
  previousItems: OrderItem[],
): OrderItem[] {
  const prev = new Map(previousItems.map((r) => [r.vendorItemId, r]))
  const core: OrderItem[] = catalog.map((cat) => {
    const prior = prev.get(cat.id)
    return {
      vendorItemId: cat.id,
      included: false,
      quantity: '',
      unit: prior?.unit?.trim() ? prior.unit : cat.unit,
    }
  })
  return attachLastContext(core, previousItems)
}
