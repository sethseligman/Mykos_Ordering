import type { OrderDraft, Vendor, VendorItem } from '../types/order'

/** Display / message label: base name plus optional pack (e.g. Spanakopita (2x12)). */
export function vendorItemMessageLabel(item: VendorItem): string {
  return item.packSize ? `${item.name} (${item.packSize})` : item.name
}

function formatDeliveryHeading(isoDate: string, fallbackDayLabel: string): string {
  const raw = isoDate.trim()
  if (!raw) return fallbackDayLabel
  const d = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return fallbackDayLabel
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

/** Shared with read-only “last order” display so formatting matches outbound text. */
export function formatItemLine(
  quantity: string,
  unit: string,
  itemName: string,
): string {
  const q = quantity.trim()
  const u = unit.trim()
  const name = itemName.trim()
  const nameLower = name.toLowerCase()
  const unitLower = u.toLowerCase()

  if (u === '#') {
    return `${q}# ${name}`.trim()
  }
  if (
    u &&
    unitLower !== '#' &&
    (nameLower.includes(unitLower) ||
      (unitLower === 'racks' && nameLower.includes('rack')))
  ) {
    return `${q} ${name}`.trim()
  }
  if (u) {
    return `${q} ${u} ${name}`.trim()
  }
  return `${q} ${name}`.trim()
}

export function buildOrderMessage(
  vendor: Vendor,
  catalog: VendorItem[],
  draft: OrderDraft,
): string {
  const catalogById = new Map(catalog.map((i) => [i.id, i]))

  const lines: string[] = []
  for (const row of draft.items) {
    if (!row.included) continue
    const cat = catalogById.get(row.vendorItemId)
    if (!cat) continue
    if (!row.quantity.trim()) continue
    lines.push(
      `- ${formatItemLine(row.quantity, row.unit, vendorItemMessageLabel(cat))}`,
    )
  }

  const vendorNotes = draft.vendorNotes.trim()
  const notesBlock = vendorNotes ? `\n\n${vendorNotes}` : ''

  const rep = draft.repFirstName.trim() || vendor.primaryRepFirstName
  const whenLabel = formatDeliveryHeading(
    draft.deliveryDate,
    vendor.activeOrderDay,
  )

  return `Hi ${rep},

For ${whenLabel} can we please have:

${lines.length ? lines.join('\n') : '(no line items yet)'}${notesBlock}

Thanks`
}
