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

## Key IDs (Hardcoded — TODO: replace with auth session in Phase 3)
- **Restaurant ID:** `196119fc-3f8f-4344-9731-cad4a2ebc63e`
- **D'Artagnan vendor ID:** `b17c6753-772d-464a-8fc4-b821a34a3dbd`
- **Ace/Endico vendor ID:** `4059018a-1099-418b-8dac-812e6d85195f`
- **Optima vendor ID:** `f60b1a6c-9aa5-4a96-817c-770951188110`
- **Supabase auth user ID:** `e7320e53-06b9-40f8-bb30-1cd7b16dc69c`

---

## Architecture Rules (Do Not Violate)
1. Catalog comes from the order sheet / import only — no SKUs invented elsewhere
2. History comes from real orders — not inferred from catalog metadata
3. Suggestions come from history — not from catalog alone
4. Full catalog is always rendered — suggestions only set `included` / `quantity`
5. History must not expand the catalog — unknown SKUs in history are ignored

---

## Database Schema (Supabase)
Tables in `public`:
- `restaurants` — multi-tenancy root, one row per restaurant
- `vendors` — per restaurant, loaded from Supabase (replaces static TS arrays)
- `vendor_catalog_items` — populated by CSV/XLSX import or manual entry
- `order_drafts` — unique constraint on (vendor_id, restaurant_id), upsert on save
- `finalized_orders` — sent orders with full line items and message text
- `execution_log` — every send action with channel, destination, status

**RLS:** Enabled on all tables. All rows scoped by restaurant_id via 
`get_current_restaurant_id()` helper function.

**Order placement methods:** `sms` | `email` | `portal` | `other`
**Order draft status:** `draft` | `ready` | `sent`
**Portal dashboard status:** `not_started` | `draft` | `draft_ready` | `sent`

---

## Vendor Architecture
**Three custom vendor workspaces** (D'Artagnan, Ace/Endico, Optima):
- Rich features: suggestion history, templates, standing orders
- Hardcoded routing in App.tsx by UUID
- Each has its own OrderSheet, SeedHistory, VendorConfig files

**Generic vendor workspace** (all other vendors):
- `GenericVendorWorkspace.tsx` — reads config and catalog from Supabase
- Supports custom one-off items (vendorItemId starts with `custom:`)
- Same Finalize Order modal as custom workspaces

**Routing in App.tsx:**
- Known UUIDs → custom workspaces
- Any other UUID containing `-` → GenericVendorWorkspace
- Known views: `portal` | `admin` | `addVendor` | `editVendor`

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
│   │   │   ├── AddVendorScreen.tsx  — 5-step wizard with catalog import
│   │   │   ├── EditVendorScreen.tsx — long form, pre-populated
│   │   │   └── VendorAdminScreen.tsx — vendor list with archive
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── OrderPortalScreen.tsx
│   │   │   │   ├── GenericVendorWorkspace.tsx
│   │   │   │   ├── FinalizeOrderModal.tsx
│   │   │   │   ├── VendorHeader.tsx
│   │   │   │   ├── OrderCartSummaryPanel.tsx
│   │   │   │   └── ...other shared components
│   │   │   ├── vendorQueries.ts     — fetchVendors, mapSupabaseVendorRowToVendor
│   │   │   ├── draftQueries.ts      — saveDraftToSupabase (upsert), loadDraftWithTimestampFromSupabase
│   │   │   ├── finalizedOrderQueries.ts
│   │   │   ├── portalVendors.ts     — fetchPortalVendors (Supabase) + static fallback
│   │   │   └── portalVendorState.ts — buildPortalVendorCta, status helpers
│   │   ├── dartagnan/               — custom workspace + order sheet
│   │   ├── ace-endico/              — custom workspace + order sheet
│   │   └── optima/                  — custom workspace + order sheet
│   └── lib/
│       ├── supabase.ts              — Supabase client
│       └── buildOrderMessage.ts     — generates order text
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

---

## Current Vendors in App
| Vendor | Type | Method | Status |
|--------|------|--------|--------|
| D'Artagnan | Custom workspace | SMS | ✅ Full |
| Ace/Endico | Custom workspace | SMS | ✅ Full |
| Optima | Custom workspace | SMS | ✅ Full |
| Sogno Toscano | Generic workspace | Portal | ✅ With catalog |
| PFD Meat | Generic workspace | Email | ✅ No catalog |

**Still need to add:** Baldor, MFE, Imperial

---

## Known UX Debt (Fix Before Phase 3 Features)
1. **Sticky bottom bar** — root cause is overflow-hidden on shell div;
   fix is overflow-clip. Bottom bar should be lg:hidden; desktop actions
   move to right-rail sidebar.
2. **Portal status labels** — update to: Draft / Ready to place / Sent
3. **Ace/Endico SMS button ghosted** — undiagnosed
4. **Desktop layout** — needs fresh approach; bottom bar is mobile-only
5. **Order sheet opens blank by default** — "Build from history" button
   populates from suggestions; draft must be explicitly saved or resets
6. **Pack size in checklist rows** — duplicate-named items indistinguishable
7. **Destination field validation** — phone/email/URL format checking
8. **Order completion feedback** — no clear signal that day's ordering is done
9. **Mobile header compression** — rep name, greeting, redundant channel
   display all removed; delivery date promoted; status badge logic fixed

---

## Development Workflow
- All work done in Cursor (AI code editor)
- Branch naming: `phase-N/short-description`
- Merge to main → Vercel auto-deploys
- Always commit and push before ending a session
- Schema changes done manually in Supabase SQL Editor

---

## What NOT to Do
- Do not add Phase 3+ features before clearing Phase 2 debt
- Do not try to build a global item database — per-restaurant catalogs only
- Do not rush SMS/email automation before the send flow is stable
- Do not redesign the portal before real order history is accumulated
- Do not fight the card/shell div structure with sticky positioning

---

## Business Context
- Currently: single user (Seth), test restaurant "Mykos"
- Near term: 2-3 chef friends using for free, collect feedback
- Medium term: charge first restaurant, grow from there
- Long term: SaaS platform for independent restaurants
- Moat: domain expertise + worksheet-first architecture + history-driven suggestions
