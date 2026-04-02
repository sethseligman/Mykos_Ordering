import type { VendorPlatformConfig } from './vendorConfig'

type VendorPlatformOverrides = Partial<VendorPlatformConfig['settings']>

function keyForVendorPlatformOverrides(vendorId: string): string {
  return `ordering-app:vendorPlatformOverrides:${vendorId}`
}

export function readVendorPlatformOverrides(
  vendorId: string,
): VendorPlatformOverrides {
  try {
    const raw = localStorage.getItem(keyForVendorPlatformOverrides(vendorId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as VendorPlatformOverrides
  } catch {
    return {}
  }
}

export function writeVendorPlatformOverrides(
  vendorId: string,
  overrides: VendorPlatformOverrides,
): void {
  localStorage.setItem(
    keyForVendorPlatformOverrides(vendorId),
    JSON.stringify(overrides),
  )
}

export function clearVendorPlatformOverrides(vendorId: string): void {
  localStorage.removeItem(keyForVendorPlatformOverrides(vendorId))
}

export function resolveVendorPlatformConfig(
  base: VendorPlatformConfig,
): VendorPlatformConfig {
  const overrides = readVendorPlatformOverrides(base.id)
  return {
    ...base,
    settings: {
      ...base.settings,
      ...overrides,
      profile: {
        ...base.settings.profile,
        ...(overrides.profile ?? {}),
      },
      orderCadence: {
        ...base.settings.orderCadence,
        ...(overrides.orderCadence ?? {}),
      },
      orderPlacement: {
        ...base.settings.orderPlacement,
        ...(overrides.orderPlacement ?? {}),
      },
      capabilities: {
        ...base.settings.capabilities,
        ...(overrides.capabilities ?? {}),
      },
    },
  }
}

