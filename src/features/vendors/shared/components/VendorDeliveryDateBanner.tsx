import type {
  InvalidDateStrategy,
  VendorDeliveryDateValidation,
} from '../vendorScheduling/types'
import { formatShortDeliveryDate } from '../vendorScheduling/weekdayUtils'

type Props = {
  validation: VendorDeliveryDateValidation
  invalidDateStrategy: InvalidDateStrategy
  onUseSuggestedDate?: (iso: string) => void
}

export function VendorDeliveryDateBanner({
  validation,
  invalidDateStrategy,
  onUseSuggestedDate,
}: Props) {
  if (validation.isValid) return null

  const showSuggest =
    invalidDateStrategy === 'suggest_next_valid_date' &&
    validation.suggestedNextValidDate

  return (
    <div
      className="border-b border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="alert"
    >
      <p className="font-medium">{validation.message}</p>
      {invalidDateStrategy === 'allow_blank_order' ? (
        <p className="mt-2 text-xs text-amber-900/90">
          You can still edit the checklist. History-based fill and standing
          orders apply only on a valid delivery day.
        </p>
      ) : null}
      {invalidDateStrategy === 'block_order' ? (
        <p className="mt-2 text-xs font-medium text-amber-900">
          Generate, copy, text, and mark sent are disabled until the delivery
          date is valid.
        </p>
      ) : null}
      {showSuggest && validation.suggestedNextValidDate ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-amber-900/90">
            Switch this order to the next valid delivery day?
          </span>
          <button
            type="button"
            onClick={() =>
              onUseSuggestedDate?.(validation.suggestedNextValidDate!)
            }
            className="rounded-md border border-amber-800/40 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 shadow-sm hover:bg-amber-100/80"
          >
            Use {formatShortDeliveryDate(validation.suggestedNextValidDate)}
          </button>
        </div>
      ) : null}
    </div>
  )
}
