import { useEffect, useRef, useState } from 'react'

type Args = {
  deliveryDate: string
  isDeliveryDateValid: boolean
}

/**
 * Tracks whether checklist assumptions are stale after a delivery-date change.
 * We only prompt rebuild on valid dates and require explicit user confirmation.
 */
export function useChecklistDateRebuildPrompt({
  deliveryDate,
  isDeliveryDateValid,
}: Args) {
  const assumedDateRef = useRef(deliveryDate)
  const [pendingRebuildDate, setPendingRebuildDate] = useState<string | null>(
    null,
  )
  const [preservedDate, setPreservedDate] = useState<string | null>(null)

  useEffect(() => {
    if (deliveryDate === assumedDateRef.current) {
      setPendingRebuildDate(null)
      setPreservedDate(null)
      return
    }

    if (!isDeliveryDateValid) {
      setPendingRebuildDate(null)
      return
    }

    if (preservedDate === deliveryDate) {
      setPendingRebuildDate(null)
      return
    }

    setPendingRebuildDate(deliveryDate)
  }, [deliveryDate, isDeliveryDateValid, preservedDate])

  const markChecklistRebuiltForCurrentDate = () => {
    assumedDateRef.current = deliveryDate
    setPendingRebuildDate(null)
    setPreservedDate(null)
  }

  const keepCurrentDraftForCurrentDate = () => {
    setPendingRebuildDate(null)
    setPreservedDate(deliveryDate)
  }

  const usingManuallyPreservedDraft =
    preservedDate === deliveryDate && deliveryDate !== assumedDateRef.current

  return {
    pendingRebuildDate,
    usingManuallyPreservedDraft,
    markChecklistRebuiltForCurrentDate,
    keepCurrentDraftForCurrentDate,
  }
}
