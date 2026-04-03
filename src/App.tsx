import { useState } from 'react'
import { AddVendorScreen } from './features/vendors/admin/AddVendorScreen'
import { VendorAdminScreen } from './features/vendors/admin/VendorAdminScreen'
import { AceEndicoVendorWorkspace } from './features/vendors/ace-endico/AceEndicoVendorWorkspace'
import { DartagnanVendorWorkspace } from './features/vendors/dartagnan/DartagnanVendorWorkspace'
import { OptimaVendorWorkspace } from './features/vendors/optima/OptimaVendorWorkspace'
import { OrderPortalScreen } from './features/vendors/shared/components/OrderPortalScreen'
import { SignInScreen, useAuth } from './features/auth'

// TODO: replace hardcoded UUIDs with dynamic vendor registry
// once vendor admin CRUD is complete in Phase 2
type ActiveView =
  | 'portal'
  | 'b17c6753-772d-464a-8fc4-b821a34a3dbd'
  | '4059018a-1099-418b-8dac-812e6d85195f'
  | 'f60b1a6c-9aa5-4a96-817c-770951188110'
  | 'admin'
  | 'addVendor'

function App() {
  const { session, loading } = useAuth()
  const [activeView, setActiveView] = useState<ActiveView>('portal')
  const [portalRefresh, setPortalRefresh] = useState(0)

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center">Loading...</div>
  }

  if (!session) {
    return <SignInScreen />
  }

  const openVendor = (vendorId: string) => {
    if (vendorId === 'b17c6753-772d-464a-8fc4-b821a34a3dbd')
      setActiveView('b17c6753-772d-464a-8fc4-b821a34a3dbd')
    else if (vendorId === '4059018a-1099-418b-8dac-812e6d85195f')
      setActiveView('4059018a-1099-418b-8dac-812e6d85195f')
    else if (vendorId === 'f60b1a6c-9aa5-4a96-817c-770951188110')
      setActiveView('f60b1a6c-9aa5-4a96-817c-770951188110')
  }

  const backToPortal = () => {
    setActiveView('portal')
    setPortalRefresh((n) => n + 1)
  }

  if (activeView === 'b17c6753-772d-464a-8fc4-b821a34a3dbd') {
    return <DartagnanVendorWorkspace onBack={backToPortal} />
  }
  if (activeView === 'f60b1a6c-9aa5-4a96-817c-770951188110') {
    return <OptimaVendorWorkspace onBack={backToPortal} />
  }
  if (activeView === '4059018a-1099-418b-8dac-812e6d85195f') {
    return <AceEndicoVendorWorkspace onBack={backToPortal} />
  }

  if (activeView === 'admin') {
    return (
      <VendorAdminScreen
        onBack={backToPortal}
        onAddVendor={() => setActiveView('addVendor')}
      />
    )
  }

  if (activeView === 'addVendor') {
    return (
      <AddVendorScreen onBack={() => setActiveView('admin')} />
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
