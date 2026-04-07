import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../../lib'

// TODO: replace with auth session restaurant ID in Phase 2
const RESTAURANT_ID = '196119fc-3f8f-4344-9731-cad4a2ebc63e'

type Props = {
  vendorId: string
  vendorName: string
  onBack: () => void
}

type CatalogItem = {
  id: string
  vendor_id: string
  restaurant_id: string
  name: string
  unit: string
  pack_size: string | null
  display_order: number
}

function unitPackLine(unit: string, packSize: string | null): string {
  const u = unit.trim()
  const p = packSize?.trim()
  if (p) return `${u} · ${p}`
  return u || '—'
}

export function CatalogEditorScreen({
  vendorId,
  vendorName,
  onBack,
}: Props) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editPackSize, setEditPackSize] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newPackSize, setNewPackSize] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('vendor_catalog_items')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('restaurant_id', RESTAURANT_ID)
        .order('display_order', { ascending: true })

      if (fetchError) throw new Error(fetchError.message)
      setItems((data ?? []) as CatalogItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog.')
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const startEdit = (item: CatalogItem) => {
    setEditError(null)
    setEditingId(item.id)
    setEditName(item.name)
    setEditUnit(item.unit)
    setEditPackSize(item.pack_size ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    setEditError(null)
    const pack =
      editPackSize.trim() === '' ? null : editPackSize.trim()
    const { error: updateError } = await supabase
      .from('vendor_catalog_items')
      .update({
        name: editName.trim(),
        unit: editUnit.trim(),
        pack_size: pack,
      })
      .eq('id', editingId)

    if (updateError) {
      setSaving(false)
      setEditError(updateError.message)
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingId
          ? {
              ...i,
              name: editName.trim(),
              unit: editUnit.trim(),
              pack_size: pack,
            }
          : i,
      ),
    )
    setEditingId(null)
    setSaving(false)
  }

  const handleDelete = async (item: CatalogItem) => {
    if (
      !window.confirm(
        `Delete ${item.name}? This cannot be undone.`,
      )
    )
      return
    setDeleting(item.id)
    const { error: deleteError } = await supabase
      .from('vendor_catalog_items')
      .delete()
      .eq('id', item.id)

    setDeleting(null)
    if (deleteError) {
      window.alert(deleteError.message)
      return
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    if (editingId === item.id) cancelEdit()
  }

  const addItem = async (e: FormEvent) => {
    e.preventDefault()
    setAddError(null)
    const name = newName.trim()
    const unit = newUnit.trim()
    if (!name) {
      setAddError('Name is required.')
      return
    }
    if (!unit) {
      setAddError('Unit is required.')
      return
    }
    const maxOrder =
      items.length === 0
        ? -1
        : Math.max(...items.map((i) => i.display_order))
    const display_order = maxOrder + 1
    const pack = newPackSize.trim() === '' ? null : newPackSize.trim()

    setSaving(true)
    const { data, error: insertError } = await supabase
      .from('vendor_catalog_items')
      .insert({
        vendor_id: vendorId,
        restaurant_id: RESTAURANT_ID,
        name,
        unit,
        pack_size: pack,
        display_order,
      })
      .select('*')
      .single()

    setSaving(false)
    if (insertError) {
      setAddError(insertError.message)
      return
    }
    setItems((prev) => [...prev, data as CatalogItem])
    setNewName('')
    setNewUnit('')
    setNewPackSize('')
  }

  const inputClass =
    'mt-1.5 w-full min-h-11 rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 sm:text-sm'

  return (
    <div className="flex min-h-dvh flex-col bg-[#e8e4dc] font-sans text-stone-800">
      <div className="mx-auto w-full max-w-lg flex-1 px-3 py-6 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold uppercase tracking-wide text-stone-600 hover:text-stone-900"
        >
          Back to admin
        </button>
        <h1 className="mt-4 text-xl font-semibold text-stone-900">
          {vendorName} — Catalog
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {loading ? 'Loading…' : `${items.length} items`}
        </p>

        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-stone-600">Loading catalog…</p>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
              <button
                type="button"
                onClick={() => void loadItems()}
                className="mt-2 block text-xs font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-stone-600">No catalog items yet.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm"
              >
                {editingId === item.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                        Pack size{' '}
                        <span className="font-normal text-stone-400">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={editPackSize}
                        onChange={(e) => setEditPackSize(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. 2x12"
                      />
                    </div>
                    {editError ? (
                      <p className="text-xs text-red-600">{editError}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveEdit()}
                        className="min-h-11 flex-1 rounded-md bg-stone-900 px-3 py-2 text-sm font-semibold text-stone-50 disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={cancelEdit}
                        className="min-h-11 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-stone-900 break-words">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {deleting === item.id
                        ? 'Deleting…'
                        : unitPackLine(item.unit, item.pack_size)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={deleting !== null}
                        onClick={() => startEdit(item)}
                        className="text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deleting !== null}
                        onClick={() => void handleDelete(item)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 border-t border-stone-300 pt-6">
          <h2 className="text-sm font-semibold text-stone-900">Add item</h2>
          <form onSubmit={(e) => void addItem(e)} className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                Pack size{' '}
                <span className="font-normal text-stone-400">(optional)</span>
              </label>
              <input
                type="text"
                value={newPackSize}
                onChange={(e) => setNewPackSize(e.target.value)}
                className={inputClass}
                placeholder="e.g. 2x12"
              />
            </div>
            {addError ? (
              <p className="text-xs text-red-600">{addError}</p>
            ) : null}
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 w-full rounded-md bg-stone-900 py-2.5 text-sm font-semibold text-stone-50 disabled:opacity-60"
            >
              {saving && editingId === null
                ? 'Adding…'
                : 'Add item'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
