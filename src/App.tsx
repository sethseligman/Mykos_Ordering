import { useState } from 'react'
import { AddVendorScreen } from './features/vendors/admin/AddVendorScreen'
import { CatalogEditorScreen } from './features/vendors/admin/CatalogEditorScreen'
import { OrderHistoryScreen } from './features/vendors/admin/OrderHistoryScreen'
import { EditVendorScreen } from './features/vendors/admin/EditVendorScreen'
import { VendorAdminScreen } from './features/vendors/admin/VendorAdminScreen'
import { GenericVendorWorkspace } from './features/vendors/shared/components/GenericVendorWorkspace'
import { OrderPortalScreen } from './features/vendors/shared/components/OrderPortalScreen'
import { SignInScreen, useAuth, useUserRole } from './features/auth'

const KNOWN_VIEWS = [
  'portal',
  'admin',
  'addVendor',
  'editVendor',
  'catalog',
  'orderHistory',
] as const

// Portal, admin flows, or any vendor UUID (custom workspaces + generic).
type ActiveView =
  | (typeof KNOWN_VIEWS)[number]
  | (string & {})

function App() {
  const { session, loading } = useAuth()
  const userRole = useUserRole()
  const [activeView, setActiveView] = useState<ActiveView>('portal')
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [catalogVendorId, setCatalogVendorId] = useState<string | null>(null)
  const [catalogVendorName, setCatalogVendorName] = useState<string>('')
  const [historyVendorId, setHistoryVendorId] = useState<string | null>(null)
  const [historyVendorName, setHistoryVendorName] = useState<string>('')
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
        onManageCatalog={(vendorId, vendorName) => {
          setCatalogVendorId(vendorId)
          setCatalogVendorName(vendorName)
          setActiveView('catalog')
        }}
        onViewHistory={(vendorId, vendorName) => {
          setHistoryVendorId(vendorId)
          setHistoryVendorName(vendorName)
          setActiveView('orderHistory')
        }}
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

  if (activeView === 'catalog' && catalogVendorId) {
    return (
      <CatalogEditorScreen
        vendorId={catalogVendorId}
        vendorName={catalogVendorName}
        onBack={() => setActiveView('admin')}
      />
    )
  }

  if (activeView === 'orderHistory' && historyVendorId) {
    return (
      <OrderHistoryScreen
        vendorId={historyVendorId}
        vendorName={historyVendorName}
        onBack={() => setActiveView('admin')}
      />
    )
  }

  return (
    <OrderPortalScreen
      refreshKey={String(portalRefresh)}
      onOpenVendor={openVendor}
      onOpenVendorAdmin={
        userRole === 'owner' ? () => setActiveView('admin') : undefined
      }
    />
  )
}

export default App
