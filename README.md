# Mykos ordering

Client-only React app for building vendor orders from a **fixed catalog** (order sheet), **history-informed suggestions**, and **generated SMS-style messages**. There is **no backend**; state lives in **localStorage** and bundled TypeScript seed data.

**Stack:** React 19, TypeScript, Vite, Tailwind CSS 4.

---

## What the app does today

- **Order portal** — Lists configured vendors with status derived from local drafts and last-sent snapshots (`OrderPortalScreen`, `portalVendors`).
- **Per-vendor workspace** — Tabs: **Current order** (full checklist), **History** (vendor-specific), **Settings** (read-only rules where implemented).
- **Catalog** — Each vendor’s SKUs come from a **static “order sheet”** array in code (the vendor’s section of their real sheet), transformed into `VendorItem[]`.

  > Note: Order sheets are currently represented as static TypeScript arrays in the codebase.  
  > This is a temporary seeded ingestion format, not the final long-term import format.  
  > Future versions may ingest sheet data from CSV, XLSX, pasted text, or parsed documents.

- **Suggestions** — Initial checklist lines are produced by the current history-weighted suggestion engine, which scores structured order history against the catalog (see below). Suggested lines are pre-checked with quantities; everything else stays unchecked until the user enables it.
- **Outbound text** — `buildOrderMessage` formats a message; SMS-capable vendors can open a native `sms:` URL with the body prefilled.

---

## Core platform rules (do not violate)

| Rule | Meaning in code |
|------|------------------|
| **Catalog comes from the order sheet** | Master list = `VendorCatalogSheetRow[]` → `buildVendorCatalogFromSheet` → `VendorItem[]`. No other source may define which SKUs exist. |
| **History comes from messages / prior orders** | Represented as `VendorHistoryOrder[]` (`VendorHistoryLine` per line). Today: hand-maintained seed files and/or app-written localStorage—not live message parsing. |
| **Suggestions come from history, not catalog** | `generateSuggestedOrderItemsFromHistory` reads history against the catalog shape; it does **not** invent SKUs or let sheet metadata alone determine suggested quantities. |
| **Full catalog is always rendered** | Checklist UIs map **every** `VendorItem`; suggestion only sets `included` / `quantity` on those rows. |
| **Suggested items are preselected only** | Recurring SKUs get `included: true` and a mode quantity; non-suggested rows remain `included: false` with empty quantity until the user changes them. |

**History must not expand the catalog.** If a past message mentions a SKU not on the sheet, it cannot appear as a catalog row unless you add it to the sheet data first.

---

## Architecture (`src/features/vendors/`)

```
vendors/
├── admin/           # Vendor admin shell + add-vendor form scaffolds (no persistence)
├── dartagnan/       # D’Artagnan: meat sheet, workspace, order sheet, seed history, templates
├── optima/          # Optima: dry-goods sheet, workspace, order sheet, seed history, rich history merge
└── shared/
    ├── vendorData/  # Catalog/history/suggestion pipeline (types + builders)
    ├── components/  # OrderPortalScreen, VendorHeader, VendorCard, checklist controls
    ├── vendorConfig.ts, portalVendors.ts, portalVendorState.ts
    └── orderChecklistSort.ts
```

**Vendor module pattern (typical):**

- `*VendorConfig.ts` — `VendorPlatformConfig` for the portal card (id, labels, contact, `hasSuggestedOrder`, etc.).
- `*Vendor.ts` or `*.mock.ts` — `Vendor` profile (reps, days, channel) and often catalog construction.
- `*OrderSheet*.ts` / `*MeatOrderSheet.ts` / `*DryGoodsSheet.ts` — Source rows for **catalog only**.
- `*SeedHistory.ts` — `VendorHistoryOrder[]` via `buildVendorHistoryFromSource` for **suggestions** (and Optima: also merged into History UI).
- `*OrderSheet.tsx` — Draft UI: localStorage, sort modes, send/copy, append history on send.

Cross-cutting: `src/lib/` (message build, last-sent snapshot, baseline hints), `src/types/` (`order`, `orderHistory`, `lastSentOrder`, `portal`).

---

## Data flow

High level:

1. **Sheet → catalog** — `buildVendorCatalogFromSheet(vendorId, sheetRows)` maps each row to `{ id, name, unit, packSize? }`.
2. **History → suggestion** — `generateSuggestedOrderItemsFromHistory(history, masterCatalog)` returns one `OrderItem` per catalog row (`included` / `quantity` from recent orders).
3. **Catalog + suggestion → current order UI** — Order sheet components keep a full `OrderItem[]` aligned to catalog order; optional **last-sent baseline** (`applyLastSentBaselineToOrderItems`) enriches rows with display-only `lastQuantity` / `lastUnit` from `lastSentOrderStorage`.

### `buildVendorCatalogFromSheet`

File: `shared/vendorData/buildVendorCatalogFromSheet.ts`  
Maps `VendorCatalogSheetRow` → `VendorItem`. Intended to stay stable if the sheet is later loaded from CSV/XLSX instead of TS arrays.

### `buildVendorHistoryFromSource`

File: `shared/vendorData/buildVendorHistoryFromSource.ts`  

- `kind: 'structured_orders'` — Returns the provided `VendorHistoryOrder[]` (current use for seeds).
- `kind: 'message_archive'` — **Stub:** returns `[]` until real parsing exists.

### `suggestOrderFromHistory` (module: `suggestOrderFromHistory.ts`)

This is the current suggestion implementation, not the final adaptive projection engine. It is intentionally deterministic and history-weighted for now, and may evolve as the platform begins learning from user overrides and real send behavior.

Exported as **`generateSuggestedOrderItemsFromHistory`**. Optima re-exports it as `generateOptimaSuggestedOrder`.

**Behavior:**

- Looks at the **10 most recent** history orders (by `date`).
- For each catalog row, counts how many of those orders contain a line with matching **`itemId` and `packSizeSnapshot` vs `VendorItem.packSize`** (both optional pack must match as strings).
- Includes the row if hit count ≥ `max(4, ceil(0.35 × number_of_orders_in_window))`.
- Quantity = **mode** of matched quantities in that window.

Also exported: `countCatalogItemFrequencyInRecentHistory` (for diagnostics / UI if needed).

### `buildVendorDataBundle`

File: `shared/vendorData/buildVendorDataBundle.ts`  
Convenience: sheet rows + history → `{ masterCatalog, history, suggestedItems }`. Vendors may inline the same steps instead of calling this.

---

## `packSize`

- On the sheet type `VendorCatalogSheetRow`, **`packSize` is optional** and is **not** part of `name`.
- It becomes `VendorItem.packSize` and is used to distinguish SKUs that share the same display **name** (e.g. two spanakopita pack formats).
- For history lines, **`packSizeSnapshot`** must align with the catalog row’s `packSize` for suggestion matching and for Optima’s rich history storage.
- **Outbound / some labels:** `vendorItemMessageLabel` appends pack in parentheses when present (e.g. `Name (2x12)`), so vendors see which variant was ordered even though the stored `name` field stays short.

---

## Vendors (current)

### D’Artagnan (`dartagnan/`)

- **Catalog:** `dartagnanMeatOrderSheetRows` → `dartagnanVendorItems` via `buildVendorCatalogFromSheet` (see `dartagnan.mock.ts`).
- **Suggestions:** `dartagnanOrderHistory` from `dartagnanSeedHistory.ts` + `generateSuggestedOrderItemsFromHistory` in `buildInitialDartagnanDraft`.
- **Templates:** `dartagnanItemTemplates.ts` — user can load **Tuesday**, **Friday**, or **Last order** presets on top of the full catalog; these are **hand-authored** rows, not inferred from the sheet.
- **History tab:** **localStorage only** (`orderHistoryStorage.ts`), plus a **synthetic row** from the last-sent snapshot if that send is not already in the list. **Seed history is not merged into the History tab** (it only drives suggestions).

### Optima (`optima/`)

- **Catalog:** `optimaDryGoodsSheetRows` → `optimaCatalogItems` (`optimaCatalog.ts`).
- **Suggestions:** `optimaSeedHistory` + `generateOptimaSuggestedOrder` (`optima.mock.ts` / `OptimaOrderSheet.tsx`).
- **History tab:** **Merges** app-written rich history from localStorage with **seed** history (`optimaOrderHistoryStorage.ts` → `readOptimaDisplayedHistory`).

> Note: History handling differs between vendors today. This is acceptable for the current implementation, but the long-term goal is to converge toward a shared history model with vendor-specific rules layered on top.

---

## Entry points

- `App.tsx` — Top-level view routing between portal, vendor workspaces, and admin screens.
- `OrderPortalScreen` — Main vendor dashboard / landing screen.
- `*VendorWorkspace.tsx` — Main per-vendor workspace container.
- `*OrderSheet.tsx` — Editable current-order UI with checklist, suggestion state, and outbound message generation.

---

## Persistence (browser only)

- Drafts, last-sent timestamps, **last-sent line snapshot** (for “repeat last” / baseline hints).
- **D’Artagnan** order history: compact entries (preview, counts).
- **Optima** order history: richer entries (full line items for display and suggestion continuity).

No sync, no API, no multi-device story.

---

## Known gaps and limitations

- **No real message parsing** — `message_archive` in `buildVendorHistoryFromSource` is unimplemented; history is structured seed + app output.
- **Suggestion engine is fixed** — Static thresholds (`RECENT_ORDER_COUNT`, `MIN_HITS`, `MIN_RATIO`); not adaptive per vendor or seasonality.
- **No user-override learning yet** — The system does not yet learn from edits made by the user before sending (unchecked suggestions, manually added items, quantity changes).
- **No persistence layer** — No server DB; clearing storage loses history/drafts.
- **Admin / onboarding incomplete** — `VendorAdminScreen` / `AddVendorScreen` are navigation and form shells only; `portalVendors` is a static array.
- **Vendor registry** — Adding a vendor requires code changes (new folder, sheet, config, `App.tsx` route), not in-app CRUD.

---

## Development rules (for humans and Cursor)

1. **New SKUs:** Add to the vendor’s **sheet** source file first, then fix seeds/history line `itemId`s; never add catalog rows only inside history.
2. **Suggestions:** Adjust history data or shared thresholds in `suggestOrderFromHistory.ts`—do not hard-code suggested SKUs in the order sheet component except for explicit **template** flows (D’Artagnan Tuesday/Friday/Last).
3. **Pack variants:** Same `name` is OK; differentiate with `packSize` on the sheet and `packSizeSnapshot` on history lines.
4. **History vs suggestions:** D’Artagnan seed history **does not** appear in History UI; Optima seed **does** merge into History—keep that distinction when changing either vendor.
5. **Avoid inventing features in docs or UI copy** — If it is not in the repo, do not document it as shipped.
6. **README is a context file, not marketing copy** — Keep it aligned to the actual codebase and current architecture. Do not describe roadmap ideas as implemented behavior.

---

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc + production bundle
npm run lint     # ESLint
```
