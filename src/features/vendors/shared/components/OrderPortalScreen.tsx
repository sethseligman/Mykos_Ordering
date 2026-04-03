import { useEffect, useMemo, useState } from 'react'
import { fetchPortalVendors, readPortalVendors } from '../portalVendors'
import {
  deliveryLabelFromSettings,
  orderTriggerLabelFromSettings,
  type VendorPlatformConfig,
} from '../vendorConfig'
import {
  buildPortalVendorCta,
  readVendorLastExecutionDisplay,
  buildVendorStatusDetailLine,
  mapOrderStatusToDashboard,
  readVendorDraftStatus,
  readVendorLastOrderDisplay,
} from '../portalVendorState'
import { VendorCard } from './VendorCard'

type Props = {
  /** Bumps derived vendor state when returning from a vendor screen */
  refreshKey: string
  onOpenVendor: (vendorId: string) => void
  onOpenVendorAdmin?: () => void
}

export function OrderPortalScreen({
  refreshKey,
  onOpenVendor,
  onOpenVendorAdmin,
}: Props) {
  const [vendors, setVendors] = useState<VendorPlatformConfig[]>(() => readPortalVendors())

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const liveVendors = await fetchPortalVendors()
        setVendors(liveVendors)
      } catch (error) {
        // TODO: replace fallback with proper error UI
        console.error('Failed to fetch portal vendors, using static fallback:', error)
      }
    }

    void loadVendors()
  }, [])

  const now = new Date()
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const vendorRows = useMemo(() => {
    return vendors.map((v) => {
      const draftStatus = readVendorDraftStatus(v.id)
      const dashboardStatus = mapOrderStatusToDashboard(draftStatus)
      const snapshotLast = readVendorLastOrderDisplay(v.id)
      const executionLast = readVendorLastExecutionDisplay(v.id)
      const operationalLine = `${orderTriggerLabelFromSettings(v.settings)} for ${deliveryLabelFromSettings(v.settings)}`
      const statusDetailLine =
        executionLast ??
        buildVendorStatusDetailLine(
          dashboardStatus,
          v.settings.capabilities.supportsHistorySuggestions,
          snapshotLast,
          v.lastKnownOrderDate,
        )
      const actionLabel = buildPortalVendorCta(v.id, draftStatus)
      return {
        ...v,
        dashboardStatus,
        operationalLine,
        statusDetailLine,
        actionLabel,
      }
    })
  }, [refreshKey, vendors])

  return (
    <div className="min-h-dvh bg-[#e8e4dc] px-3 py-5 font-sans text-stone-800 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-lg border border-stone-300 bg-[#f7f5f0] px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Order portal
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-stone-900">
                Today: {todayLabel}
              </h1>
            </div>
            {onOpenVendorAdmin ? (
              <button
                type="button"
                onClick={onOpenVendorAdmin}
                className="shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-600 underline-offset-2 hover:text-stone-900 hover:underline"
              >
                Vendor admin
              </button>
            ) : null}
          </div>
        </header>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-600">
            Vendors
          </h2>
          <ul className="flex flex-col gap-4">
            {vendorRows.map((row) => (
              <li key={row.id}>
                <VendorCard
                  name={row.settings.profile.displayName}
                  category={row.settings.profile.category}
                  operationalLine={row.operationalLine}
                  statusDetailLine={row.statusDetailLine}
                  status={row.dashboardStatus}
                  actionLabel={row.actionLabel}
                  onNavigate={() => onOpenVendor(row.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
