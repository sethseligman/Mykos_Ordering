import { useMemo, useState } from 'react'
import type { LastSentOrderSnapshot } from '../../../types/lastSentOrder'
import { readLastSentOrderSnapshot } from '../../../lib/lastSentOrderStorage'
import {
  previewFromVendorHistoryLines,
  snapshotToOrderedHistoryLines,
} from '../shared/vendorData/vendorHistoryDisplay'
import type { VendorRichHistoryEntry } from '../shared/vendorData/types'
import { SuggestionHistoryInspector } from '../shared/components/SuggestionHistoryInspector'
import { VendorHeader } from '../shared/components/VendorHeader'
import { VendorOrderHistoryPanel } from '../shared/components/VendorOrderHistoryPanel'
import { WeekdayMultiSelect } from '../shared/components/WeekdayMultiSelect'
import { formatSelectedDays } from '../shared/vendorSettingsDisplay'
import {
  resolveVendorPlatformConfig,
  writeVendorPlatformOverrides,
} from '../shared/vendorSettingsStorage'
import { dartagnanPlatformConfig } from './dartagnanVendorConfig'
import { dartagnanVendor, dartagnanVendorItems } from './dartagnan.mock'
import {
  deleteMostRecentDartagnanAppSuggestionRow,
  readDartagnanDisplayedHistory,
  readDartagnanSuggestionInspectorRows,
  toggleDartagnanSuggestionRowExcluded,
} from './orderHistoryStorage'
import { DartagnanOrderSheet } from './DartagnanOrderSheet'

type TabId = 'current' | 'history' | 'settings'

type Props = {
  onBack: () => void
}

/** If a snapshot exists but predates history storage, surface it as the newest row. */
function historyWithSnapshotFallback(
  history: VendorRichHistoryEntry[],
  snapshot: LastSentOrderSnapshot | null,
  catalog: typeof dartagnanVendorItems,
): VendorRichHistoryEntry[] {
  if (!snapshot) return history
  const covered = history.some((e) => e.sentAt === snapshot.sentAt)
  if (covered) return history
  const items = snapshotToOrderedHistoryLines(snapshot, catalog)
  const orderDate = new Date(snapshot.sentAt).toISOString().slice(0, 10)
  const synthetic: VendorRichHistoryEntry = {
    sentAt: snapshot.sentAt,
    orderDate,
    deliveryDate: '',
    items,
    preview: previewFromVendorHistoryLines(items, catalog),
    source: 'app',
  }
  return [synthetic, ...history].sort((a, b) => b.sentAt - a.sentAt)
}

export function DartagnanVendorWorkspace({ onBack }: Props) {
  const resolvedConfig = resolveVendorPlatformConfig(dartagnanPlatformConfig)
  const [tab, setTab] = useState<TabId>('current')
  const [dataTick, setDataTick] = useState(0)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [inspectorExpandedKey, setInspectorExpandedKey] = useState<string | null>(
    null,
  )
  const [inspectorTick, setInspectorTick] = useState(0)
  const [settingsDraft, setSettingsDraft] = useState(
    () => resolvedConfig.settings,
  )
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null)

  const snapshot = useMemo(() => {
    void dataTick
    return readLastSentOrderSnapshot(dartagnanVendor.id)
  }, [dataTick])

  const historyEntries = useMemo(() => {
    void dataTick
    const raw = readDartagnanDisplayedHistory(dartagnanVendorItems)
    return historyWithSnapshotFallback(raw, snapshot, dartagnanVendorItems)
  }, [dataTick, snapshot])

  const suggestionInspectorRows = useMemo(() => {
    void dataTick
    void inspectorTick
    return readDartagnanSuggestionInspectorRows(dartagnanVendorItems)
  }, [dataTick, inspectorTick])

  const tabBtn = (id: TabId, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`shrink-0 rounded-md border px-3 py-2 text-xs font-semibold sm:text-sm ${
        tab === id
          ? 'border-stone-600 bg-stone-800 text-stone-50'
          : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-dvh bg-[#e8e4dc] font-sans text-stone-800">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600 hover:text-stone-900"
        >
          Back to portal
        </button>

        <div className="overflow-hidden rounded-lg border border-stone-400/90 bg-[#f7f5f0] shadow-sm">
          <VendorHeader vendor={dartagnanVendor} />

          <div
            className="border-b border-stone-200 bg-stone-100/70 px-3 py-3 sm:px-4"
            role="tablist"
            aria-label="Vendor sections"
          >
            <div className="flex flex-wrap gap-2">
              {tabBtn('current', 'Current order')}
              {tabBtn('history', 'History')}
              {tabBtn('settings', 'Settings')}
            </div>
          </div>

          <div className="p-3 sm:p-4" role="tabpanel">
            {tab === 'current' && (
              <DartagnanOrderSheet
                embedded
                onSent={() => setDataTick((t) => t + 1)}
              />
            )}

            {tab === 'history' && (
              <VendorOrderHistoryPanel
                rows={historyEntries}
                catalog={dartagnanVendorItems}
                expandedKey={expandedKey}
                onToggle={(key) =>
                  setExpandedKey((k) => (k === key ? null : key))
                }
              />
            )}

            {tab === 'settings' && (
              <div className="rounded-md border border-stone-300 bg-[#faf8f5] px-4 py-4 shadow-inner">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
                  Vendor settings
                </h2>
                <p className="mt-2 text-sm text-stone-600">
                  Shared profile used across portal/workspace/outbound behavior.
                </p>
                {!isEditingSettings ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold"
                      onClick={() => setIsEditingSettings(true)}
                    >
                      Edit settings
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-stone-600">
                      Vendor name
                      <input
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
                        value={settingsDraft.profile.displayName}
                        onChange={(e) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            profile: { ...s.profile, displayName: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-stone-600">
                      Category
                      <input
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
                        value={settingsDraft.profile.category}
                        onChange={(e) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            profile: { ...s.profile, category: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <div className="sm:col-span-2 space-y-3">
                      <WeekdayMultiSelect
                        label="Order days"
                        selectedDays={settingsDraft.orderCadence.orderDays}
                        onChange={(orderDays) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            orderCadence: { ...s.orderCadence, orderDays },
                          }))
                        }
                      />
                      <WeekdayMultiSelect
                        label="Available delivery days"
                        selectedDays={settingsDraft.orderCadence.availableDeliveryDays}
                        disabledDays={['Sunday']}
                        onChange={(availableDeliveryDays) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            orderCadence: {
                              ...s.orderCadence,
                              availableDeliveryDays,
                              preferredDeliveryDays:
                                s.orderCadence.preferredDeliveryDays.filter((d) =>
                                  availableDeliveryDays.includes(d),
                                ),
                            },
                          }))
                        }
                      />
                      <WeekdayMultiSelect
                        label="Preferred delivery days"
                        selectedDays={settingsDraft.orderCadence.preferredDeliveryDays}
                        disabledDays={[
                          'Sunday',
                          ...(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].filter(
                            (d) =>
                              settingsDraft.orderCadence.availableDeliveryDays.length > 0 &&
                              !settingsDraft.orderCadence.availableDeliveryDays.includes(
                                d,
                              ),
                          ) as string[]),
                        ]}
                        onChange={(preferredDeliveryDays) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            orderCadence: {
                              ...s.orderCadence,
                              preferredDeliveryDays,
                            },
                          }))
                        }
                      />
                    </div>
                    <label className="text-xs font-semibold text-stone-600 sm:col-span-2">
                      Order minimum
                      <input
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
                        value={settingsDraft.orderCadence.orderMinimum}
                        onChange={(e) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            orderCadence: {
                              ...s.orderCadence,
                              orderMinimum: e.target.value,
                            },
                          }))
                        }
                        placeholder='e.g. "$500 per delivery"'
                      />
                    </label>
                    <label className="text-xs font-semibold text-stone-600">
                      Order cut-off time
                      <input
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
                        type="time"
                        value={settingsDraft.orderCadence.orderCutOffTime}
                        onChange={(e) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            orderCadence: {
                              ...s.orderCadence,
                              orderCutOffTime: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="text-xs font-semibold text-stone-600">
                      Order placement method
                      <select
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
                        value={settingsDraft.orderPlacement.method}
                        onChange={(e) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            orderPlacement: {
                              ...s.orderPlacement,
                              method: e.target.value as typeof s.orderPlacement.method,
                            },
                          }))
                        }
                      >
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                        <option value="portal">Vendor portal</option>
                        <option value="api">API</option>
                        <option value="phone">Phone</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-stone-600">
                      Destination
                      <input
                        className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
                        value={settingsDraft.orderPlacement.destination}
                        onChange={(e) =>
                          setSettingsDraft((s) => ({
                            ...s,
                            orderPlacement: {
                              ...s.orderPlacement,
                              destination: e.target.value,
                            },
                            profile: {
                              ...s.profile,
                              contactValue:
                                s.orderPlacement.method === 'sms' ||
                                s.orderPlacement.method === 'email'
                                  ? e.target.value
                                  : s.profile.contactValue,
                            },
                          }))
                        }
                      />
                    </label>
                    <div className="sm:col-span-2 flex items-center gap-3 text-xs">
                      <label>
                        <input
                          type="checkbox"
                          checked={settingsDraft.capabilities.supportsAddOns}
                          onChange={(e) =>
                            setSettingsDraft((s) => ({
                              ...s,
                              capabilities: {
                                ...s.capabilities,
                                supportsAddOns: e.target.checked,
                              },
                            }))
                          }
                        />{' '}
                        Supports add-ons
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={settingsDraft.capabilities.supportsStandingOrders}
                          onChange={(e) =>
                            setSettingsDraft((s) => ({
                              ...s,
                              capabilities: {
                                ...s.capabilities,
                                supportsStandingOrders: e.target.checked,
                              },
                            }))
                          }
                        />{' '}
                        Supports standing orders
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={settingsDraft.capabilities.supportsHistorySuggestions}
                          onChange={(e) =>
                            setSettingsDraft((s) => ({
                              ...s,
                              capabilities: {
                                ...s.capabilities,
                                supportsHistorySuggestions: e.target.checked,
                              },
                            }))
                          }
                        />{' '}
                        Supports history suggestions
                      </label>
                    </div>
                    <div className="sm:col-span-2 mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold"
                        onClick={() => {
                          writeVendorPlatformOverrides(
                            resolvedConfig.id,
                            settingsDraft,
                          )
                          setIsEditingSettings(false)
                          setSettingsSavedAt(Date.now())
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold"
                        onClick={() => {
                          setSettingsDraft(
                            resolveVendorPlatformConfig(dartagnanPlatformConfig).settings,
                          )
                          setIsEditingSettings(false)
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {settingsSavedAt ? (
                  <div className="mt-2 text-xs text-stone-500">Saved</div>
                ) : null}
                {!isEditingSettings && (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Category
                    </dt>
                    <dd className="mt-0.5 font-medium text-stone-900">
                      {settingsDraft.profile.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Channel type
                    </dt>
                    <dd className="mt-0.5 font-medium text-stone-900">
                      {settingsDraft.orderPlacement.method.toUpperCase()}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Contact
                    </dt>
                    <dd className="mt-0.5 font-mono text-stone-800">
                      {settingsDraft.profile.contactValue}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Order cadence
                    </dt>
                    <dd className="mt-0.5 text-stone-800">
                      {formatSelectedDays(settingsDraft.orderCadence.orderDays)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Preferred delivery days
                    </dt>
                    <dd className="mt-0.5 text-stone-800">
                      {formatSelectedDays(
                        settingsDraft.orderCadence.preferredDeliveryDays,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Available delivery days
                    </dt>
                    <dd className="mt-0.5 text-stone-800">
                      {formatSelectedDays(
                        settingsDraft.orderCadence.availableDeliveryDays,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Order minimum
                    </dt>
                    <dd className="mt-0.5 text-stone-800">
                      {settingsDraft.orderCadence.orderMinimum || 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Order cut-off time
                    </dt>
                    <dd className="mt-0.5 text-stone-800">
                      {settingsDraft.orderCadence.orderCutOffTime || 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Send mode
                    </dt>
                    <dd className="mt-0.5 text-stone-800">
                      {dartagnanVendor.sendMode}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Reps
                    </dt>
                    <dd className="mt-0.5 text-stone-800">
                      {dartagnanVendor.repNames}
                    </dd>
                  </div>
                  </dl>
                )}
                <SuggestionHistoryInspector
                  rows={suggestionInspectorRows}
                  catalog={dartagnanVendorItems}
                  expandedKey={inspectorExpandedKey}
                  onToggleExpand={(key) =>
                    setInspectorExpandedKey((k) => (k === key ? null : key))
                  }
                  onToggleInclude={(rowId) => {
                    toggleDartagnanSuggestionRowExcluded(rowId)
                    setInspectorTick((t) => t + 1)
                  }}
                  onDeleteMostRecentApp={() => {
                    deleteMostRecentDartagnanAppSuggestionRow()
                    setInspectorTick((t) => t + 1)
                    setDataTick((t) => t + 1)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
