import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../../lib'
import { fetchPortalVendors, readPortalVendors } from '../portalVendors'
import {
  deliveryLabelFromSettings,
  type VendorPlatformConfig,
} from '../vendorConfig'
import {
  buildPortalVendorCta,
  readVendorLastExecutionDisplay,
  buildVendorStatusDetailLine,
  mapOrderStatusToDashboard,
  readVendorDraftStatus,
  readVendorDraftTimestamp,
  readVendorLastOrderDisplay,
} from '../portalVendorState'
import { VendorCard } from './VendorCard'

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

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
  const [sentVendorIds, setSentVendorIds] = useState<Set<string>>(new Set())

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

  useEffect(() => {
    const fetchSentToday = async () => {
      try {
        const todayIso = new Date().toISOString().slice(0, 10)
        const { data } = await supabase
          .from('finalized_orders')
          .select('vendor_id, sent_at')
          .eq('restaurant_id', RESTAURANT_ID)
          .gte('sent_at', `${todayIso}T00:00:00.000Z`)
          .order('sent_at', { ascending: false })

        if (data) {
          setSentVendorIds(
            new Set(
              (data as { vendor_id: string }[]).map((r) => r.vendor_id),
            ),
          )
        }
      } catch (e) {
        console.error('Failed to fetch sent orders:', e)
      }
    }
    void fetchSentToday()
  }, [refreshKey])

  const now = new Date()
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const vendorRows = useMemo(() => {
    return vendors.map((v) => {
      const isSentToday = sentVendorIds.has(v.id)
      const draftStatus = isSentToday
        ? ('sent' as const)
        : readVendorDraftStatus(v.id)
      const dashboardStatus = isSentToday
        ? ('sent' as const)
        : mapOrderStatusToDashboard(draftStatus)
      const snapshotLast = readVendorLastOrderDisplay(v.id)
      const savedAt = readVendorDraftTimestamp(v.id)
      const executionLast = readVendorLastExecutionDisplay(v.id)
      const orderDays = v.settings.orderCadence.orderDays
      const deliveryLabel = deliveryLabelFromSettings(v.settings)
      const operationalLine =
        orderDays.length > 0
          ? `${orderDays.join(' / ')} order for ${deliveryLabel}`
          : `Order for ${deliveryLabel}`
      const statusDetailLine =
        executionLast ??
        buildVendorStatusDetailLine(
          dashboardStatus,
          snapshotLast,
          v.lastKnownOrderDate,
        )
      const actionLabel = buildPortalVendorCta(
        v.id,
        draftStatus,
        v.settings.orderPlacement.method,
      )
      return {
        ...v,
        dashboardStatus,
        operationalLine,
        statusDetailLine,
        actionLabel,
        savedAt,
      }
    })
  }, [refreshKey, vendors, sentVendorIds])

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
                  savedAt={
                    row.dashboardStatus === 'not_started'
                      ? null
                      : row.savedAt
                  }
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
