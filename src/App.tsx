import { useState } from 'react'
import { AddVendorScreen } from './features/vendors/admin/AddVendorScreen'
import { EditVendorScreen } from './features/vendors/admin/EditVendorScreen'
import { VendorAdminScreen } from './features/vendors/admin/VendorAdminScreen'
import { GenericVendorWorkspace } from './features/vendors/shared/components/GenericVendorWorkspace'
import { OrderPortalScreen } from './features/vendors/shared/components/OrderPortalScreen'
import { SignInScreen, useAuth } from './features/auth'

const KNOWN_VIEWS = ['portal', 'admin', 'addVendor', 'editVendor'] as const

// Portal, admin flows, or any vendor UUID (custom workspaces + generic).
type ActiveView =
  | (typeof KNOWN_VIEWS)[number]
  | (string & {})

function App() {
  const { session, loading } = useAuth()
  const [activeView, setActiveView] = useState<ActiveView>('portal')
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [portalRefresh, setPortalRefresh] = useState(0)

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center">Loading...</div>
  }

  if (!session) {
    return <SignInScreen />
  }

  const openVendor = (vendorId: string) => {
    setActiveView(vendorId as ActiveView)
  }

  const backToPortal = () => {
    setActiveView('portal')
    setPortalRefresh((n) => n + 1)
  }

  const openEditVendor = (vendorId: string) => {
    setEditingVendorId(vendorId)
    setActiveView('editVendor')
  }

  if (
    !KNOWN_VIEWS.includes(activeView as (typeof KNOWN_VIEWS)[number]) &&
    activeView.includes('-')
  ) {
    return (
      <GenericVendorWorkspace vendorId={activeView} onBack={backToPortal} />
    )
  }

  if (activeView === 'admin') {
    return (
      <VendorAdminScreen
        onBack={backToPortal}
        onAddVendor={() => setActiveView('addVendor')}
        onEditVendor={openEditVendor}
      />
    )
  }

  if (activeView === 'addVendor') {
    return (
      <AddVendorScreen onBack={() => setActiveView('admin')} />
    )
  }

  if (activeView === 'editVendor' && editingVendorId) {
    return (
      <EditVendorScreen
        vendorId={editingVendorId}
        onBack={() => setActiveView('admin')}
        onSaved={() => setActiveView('admin')}
      />
    )
  }

  return (
    <OrderPortalScreen
      refreshKey={String(portalRefresh)}
      onOpenVendor={openVendor}
      onOpenVendorAdmin={() => setActiveView('admin')}
    />
  )
}

export default App
