# Mykos Ordering — Project Context

## What This Is
A restaurant vendor ordering platform built by a chef (Seth Seligman)
to consolidate, manage, predict, and place vendor orders. Built with
AI-assisted development using Cursor for code generation and Claude
for architecture, prompting, and product decisions.

---

## Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL, Auth, RLS)
- **Deployment:** Vercel (auto-deploys from main branch)
- **Dev tool:** Cursor (AI code editor)

---

## URLs
- **Live app:** https://mykos-ordering.vercel.app
- **GitHub repo:** https://github.com/sethseligman/Mykos_Ordering
- **Supabase project:** https://kevcembtdmqrduluivyb.supabase.co

---

## Key IDs
- **Restaurant ID:** `196119fc-3f8f-4344-9731-cad4a2ebc63e`
- **Supabase auth user ID:** `e7320e53-06b9-40f8-bb30-1cd7b16dc69c`

NOTE: The three original hardcoded vendor UUIDs
(D'Artagnan, Ace/Endico, Optima) are now ARCHIVED.
All vendors are now created via the wizard and routed
through GenericVendorWorkspace. There are no hardcoded
vendor UUIDs anywhere in the codebase.

---

## Architecture Rules (Do Not Violate)
1. Catalog comes from the order sheet / import only — no SKUs invented elsewhere
2. History comes from real orders — not inferred from catalog metadata
3. Suggestions come from history — not from catalog alone
4. Full catalog is always rendered — suggestions only set `included` / `quantity`
5. History must not expand the catalog — unknown SKUs in history are ignored
6. One workspace for all vendors — GenericVendorWorkspace handles everything
7. No hardcoded vendor UUIDs in App.tsx or anywhere else

---

## Database Schema (Supabase)
Tables in `public`:
- `restaurants` — multi-tenancy root, one row per restaurant
- `vendors` — per restaurant, loaded from Supabase
- `vendor_catalog_items` — populated by CSV/XLSX import or manual entry
- `order_drafts` — unique constraint on (vendor_id, restaurant_id), upsert on save
- `finalized_orders` — sent orders with full line items and message text
- `execution_log` — every send action with channel, destination, status

**Schema changes made (beyond original):**
- `vendors.archived_at timestamptz` — soft delete
- `vendors.ordering_notes text` — optional notes field
- `vendors.order_days` — made nullable with default `{}`
- `order_drafts` — unique constraint `(vendor_id, restaurant_id)` added

**RLS:** Enabled on all tables. All rows scoped by restaurant_id via
`get_current_restaurant_id()` helper function.

**Order placement methods:** `sms` | `email` | `portal` | `other`
**Order draft status:** `draft` | `ready` | `sent`
**Portal dashboard status:** `not_started` | `draft` | `draft_ready` | `sent`

---

## Vendor Architecture
**One workspace for all vendors:**
- `GenericVendorWorkspace.tsx` — handles ALL vendors
- Reads config and catalog from Supabase
- Supports custom one-off items (vendorItemId starts with `custom:`)
- All three original custom workspaces (D'Artagnan, Ace/Endico, Optima)
  have been deleted — 6,340 lines of legacy code removed

**Routing in App.tsx:**
- Any UUID containing `-` → GenericVendorWorkspace
- Known views: `portal` | `admin` | `addVendor` | `editVendor` | `catalog`
- NO hardcoded vendor UUID routes

---

## Key Files
```
src/
├── App.tsx                          — top-level routing + auth gate
├── features/
│   ├── auth/
│   │   ├── useAuth.ts               — Supabase auth hook
│   │   └── SignInScreen.tsx         — email/password sign-in
│   ├── vendors/
│   │   ├── admin/
│   │   │   ├── AddVendorScreen.tsx  — 5-step wizard, duplicate name check, phone auto-format
│   │   │   ├── EditVendorScreen.tsx — pre-populated form, phone auto-format
│   │   │   ├── VendorAdminScreen.tsx — vendor list with archive + catalog button
│   │   │   └── CatalogEditorScreen.tsx — edit/add/delete catalog items per vendor
│   │   └── shared/
│   │       ├── components/
│   │       │   ├── GenericVendorWorkspace.tsx — ALL vendors use this
│   │       │   ├── FinalizeOrderModal.tsx — SMS/Email/Portal/Other actions
│   │       │   ├── OrderPortalScreen.tsx — portal, reads sent status from Supabase
│   │       │   ├── VendorCard.tsx — status badges, CTA labels
│   │       │   └── OrderCartSummaryPanel.tsx
│   │       ├── vendorScheduling/
│   │       │   ├── validateVendorDeliveryDate.ts — cutoff time aware
│   │       │   ├── types.ts — includes cutoffTime?: string
│   │       │   └── weekdayUtils.ts
│   │       ├── vendorQueries.ts
│   │       ├── draftQueries.ts      — upsert, loadDraftWithTimestampFromSupabase
│   │       ├── finalizedOrderQueries.ts
│   │       ├── portalVendors.ts     — Supabase only, no static fallback
│   │       └── portalVendorState.ts — status logic, CTA labels
│   └── lib/
│       ├── supabase.ts              — Supabase client
│       └── buildOrderMessage.ts    — generates order text
```

---

## Draft Persistence Model
- **Primary:** localStorage (immediate, fast)
- **Secondary:** Supabase (cross-device sync)
- **Sync:** Last-write-wins by timestamp
  - `ordering-app:draft:${vendorId}` — draft JSON
  - `ordering-app:draft-ts:${vendorId}` — timestamp of last local write
  - On mount: load localStorage immediately, then check Supabase —
    if Supabase updatedAt > local timestamp, hydrate from Supabase
- **Save button:** Explicit push to Supabase, shows "Saved ✓" for 1.5s
- **Auto-save:** Every draft change also fires saveDraftToSupabase (fire and forget)
- **After mark as sent:** localStorage cleared, Supabase draft reset to blank,
  workspace resets to blank with next valid delivery date

---

## Portal Status System
Status reads from TWO sources:
1. **Sent status** — reads from Supabase `finalized_orders` (today's orders)
2. **Draft status** — reads from localStorage

Status labels:
- `not_started` → "Not started" — no draft, no sent order today
- `draft` → "In progress" — draft exists with items checked
- `draft_ready` → "Ready to place" — order generated
- `sent` → "Sent · Last sent [date]" — finalized_orders has today's record

CTA labels:
- Not started → "Start order"
- In progress → "Continue draft"
- Ready → "Review & send"
- Sent → "Open workspace"

---

## Scheduling Logic
- Cutoff time awareness built in — reads `order_cutoff_time` from vendors table
- Format: "5:00 PM" or "10:00 PM" (12-hour with AM/PM)
- Lead time: 1 day (order must be placed by cutoff the day BEFORE delivery)
- `defaultDeliveryDateForScheduling` — finds next valid delivery considering
  both delivery days AND whether cutoff has passed
- `validateVendorDeliveryDate` — validates selected date, shows cutoff message
  if window has passed, suggests next valid date

---

## Current Vendors in App
| Vendor | Method | Cutoff | Delivery Days | Status |
|--------|--------|--------|---------------|--------|
| D'Artagnan | SMS | 5:00 PM | Tue / Fri | ✅ With catalog |
| Ace / Endico | SMS | 5:00 PM | Tue / Wed | ✅ With catalog |
| Optima | SMS | 10:00 PM | Thu | ✅ With catalog |
| Sogno Toscano | Portal | 5:00 PM | Wed | ✅ With catalog |
| Peter's Fish Market | SMS | TBD | Mon-Sat | ✅ With catalog |
| PFD Meat | Email | TBD | TBD | ⚠️ Needs proper setup |

**Still need to add:** Baldor, MFE, Imperial

---

## Development Workflow
- All code written via Cursor prompts — Claude writes the prompt, user runs it
- Always ask user to upload source files before writing prompts
- Never fetch from GitHub directly
- Branch naming: `phase-N/short-description`
- Merge to main → Vercel auto-deploys
- Always commit and push before ending a session
- Schema changes done manually in Supabase SQL Editor
- Test cross-device behavior in incognito window (clean localStorage)

---

## What NOT to Do
- Do not add Phase 3+ features before clearing Phase 2 debt
- Do not try to build a global item database — per-restaurant catalogs only
- Do not rush SMS/email automation before the send flow is stable
- Do not redesign the portal before real order history is accumulated
- Do not add hardcoded vendor UUIDs back to App.tsx — ever
- Do not fight the card/shell div structure with sticky positioning
- Do not try to make the metadata bar sticky inside an overflow-clip card —
  it does not work; the page scrolls, not the card

---

## Known Deferred Items (Phase 3+)
- Suggestion engine / Build from history (UI hidden until Phase 3)
- LO toggle — last order quantities ghost layer on checklist
- Portal dashboard — week-at-a-glance view
- Order completion feedback — "Tomorrow's order placed at 10:15 PM"
- History tab — full order view with line items
- Amendment order flow — "Cancel the lamb for Tuesday"
- Notepad / voice capture for kitchen notes
- Drag-to-reorder catalog items (display_order column exists, UI not built)
- Unit toggle per checklist row (ea/cs/# quick switch)
- Catalog item bulk edit (editable table view)
- In-app vendor messaging (evaluate vs amendment flow)
- Worksheets as first-class entity (many-to-many vendor assignment)
- Platform-managed master catalogs for common vendors
- Multi-delivery-per-week status visibility on portal cards

---

## Business Context
- Currently: single user (Seth), restaurant "Mykos"
- Near term: 2-3 chef friends using for free, collect feedback
- Medium term: charge first restaurant, grow from there
- Long term: SaaS platform for independent restaurants
- Moat: domain expertise + worksheet-first architecture + history-driven suggestions
