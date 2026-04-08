# Mykos Ordering — Product Roadmap

> This document is the north star for development. Refer to it before starting any new work. Do not skip phases or build features out of sequence.

---

## Phase 1 — Stabilize + Persist ✅ COMPLETE

- GitHub repo with feature branches ✅
- Supabase schema (6 tables, RLS, indexes) ✅
- Supabase Auth (email/password) ✅
- Vendors loading from Supabase ✅
- Draft/finalized order/execution log persistence ✅
- 3-vendor workflow validated end to end ✅
- Mobile/tablet responsiveness ✅
- Deployed to Vercel ✅

---

## Phase 2 — Operationalize the Platform ✅ COMPLETE

- Vendor admin CRUD (add, edit, archive) ✅
- 5-step Add Vendor wizard with CSV/XLSX catalog import ✅
- Duplicate vendor name check in wizard ✅
- Destination field validation + phone auto-format ✅
- GenericVendorWorkspace for all vendors ✅
- Placement methods (SMS/Email/Portal/Other) ✅
- Finalize Order modal ✅
- Save Draft button with Supabase sync ✅
- Cross-device draft sync (last-write-wins by timestamp) ✅
- Portal status system (Not started/In progress/Ready/Sent) ✅
- Portal reads sent status from Supabase finalized_orders ✅
- Draft clears after marking as sent ✅
- Checkbox/quantity sync (auto-check on positive qty) ✅
- Cart filters zero-quantity items ✅
- Pack size shown in checklist rows ✅
- Catalog item editor in vendor admin ✅
- Order Days field made optional ✅
- Cutoff time awareness in scheduling logic ✅
- Save/Finalize in right rail on desktop ✅
- Suggestion UI hidden until Phase 3 ✅
- Hardcoded vendor routing removed — one codebase ✅
- 6,340 lines of legacy custom workspace code deleted ✅

### Vendors currently in app
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

## Phase 3 — Improve Projection Quality

**Goal:** Make suggestions smarter by learning from real behavior.
Do not start Phase 3 features until the app has been used for
real ordering for 2-3 weeks and has real history to work with.

### Portal & Status
- Portal dashboard — week-at-a-glance view showing all vendors,
  delivery days, and order status across the week
- Multi-delivery-per-week status visibility on portal cards
- Order completion feedback — "Tomorrow's order placed at 10:15 PM.
  You're all set."
- History tab — full order view with line items, expandable

### Suggestion Engine
- Track accept / reject / modify behavior per vendor per order
- Tune suggestion logic per vendor using behavioral data
- Add lightweight day-of-week and seasonality weighting
- LO toggle — small "LO" button to left of QTY column on checklist.
  Tap reveals last order quantities as ghost layer (grey, italic,
  smaller font) beside every qty input. Tap again to hide.
  Hold until sufficient real order history exists.
- Build from history — restore "Build from history" button once
  suggestion engine is built and tuned

### Worksheets (Major Architecture Change)
The app currently maps one vendor to one order sheet.
This does not reflect how a real kitchen operates.

Real structure:
- Worksheets = how a chef thinks (Meat, Produce, Dry Goods)
- Vendors = who supplies the items
- Relationship = many-to-many and fluid

Examples:
- Meat worksheet → D'Artagnan + PFD + sometimes Baldor
- Produce worksheet → Baldor + MFE + seasonal farmers
- Dry Goods worksheet → Ace/Endico + Baldor + Sogno

Phase 3 work required:
- Introduce `worksheets` as a first-class database entity
- Add vendor_id to each catalog item (already exists)
- Allow multiple vendors per worksheet
- Order placement sends separate messages per vendor
  within the worksheet
- Suggestion engine works at worksheet level, not vendor level

### Other Phase 3 Items
- Chat/SMS import for catalog building — upload PDF or text
  export of vendor SMS/iMessage history, use Claude API to
  parse and extract structured product catalog
- Amendment order flow — "Cancel the lamb for Tuesday"
  lightweight follow-up to an existing sent order
- Notepad / voice capture for kitchen notes
- Drag-to-reorder catalog items (display_order column exists)
- Unit toggle per checklist row (ea/cs/# quick switch)
- Catalog item bulk edit (editable table view)
- Search/filter for checklist items as catalogs grow
- In-app vendor messaging (evaluate vs amendment flow)

---

## Phase 4 — Automate Execution

**Goal:** Reduce the manual work of placing orders.

- Email sending first — easier to audit, more forgiving than SMS
- Structured SMS only where it truly makes sense
- Portal/API vendor workflows where vendors support it
- Place-all-orders queue (once individual send flows are proven)

---

## Phase 5 — Intelligence Layer

**Goal:** Move from reactive ordering to proactive management.

- Parse inbound vendor confirmations to auto-update history
- Cut-off warnings and deadline awareness
- Anomaly detection (e.g. "you usually order 7 gallons of milk —
  today you have 2, is that right?")
- Replenishment and cadence logic for low-frequency items
- Multi-restaurant / SaaS architecture layer
- Build platform-managed master catalogs for common vendors
  (Baldor, Sysco, US Foods, Chef's Warehouse, Ace/Endico,
  D'Artagnan, etc.). New restaurants select their subset on
  vendor onboarding. Powers the "Use platform catalog" option
  in the Add Vendor wizard Step 3.

---

## Architecture Principles

These rules apply across all phases. Do not violate them.

| Rule | Meaning |
|------|---------|
| Catalog comes from the order sheet / import | No SKUs invented anywhere else |
| History comes from real orders | Not inferred from catalog metadata |
| Suggestions come from history | Not from catalog alone |
| Full catalog is always rendered | Suggestions only set `included` / `quantity` |
| History must not expand the catalog | Unknown SKUs in history are ignored |
| One workspace for all vendors | GenericVendorWorkspace handles everything |
| No hardcoded vendor UUIDs | Ever, anywhere in the codebase |

---

## Schema (current)

- `restaurants` — multi-tenancy root
- `vendors` — per restaurant, includes archived_at, ordering_notes
- `vendor_catalog_items` — populated by import script, editable after
- `order_drafts` — unique constraint (vendor_id, restaurant_id), upsert
- `finalized_orders` — sent orders with full line items
- `execution_log` — every send action with vendor, method, destination, timestamp, status

---

## Business Context

- Currently: single user (Seth), restaurant "Mykos"
- Near term: 2-3 chef friends using for free, collect feedback
- Medium term: charge first restaurant, grow from there
- Long term: SaaS platform for independent restaurants
- Moat: domain expertise + worksheet-first architecture +
  history-driven suggestions

---

*Last updated: April 2026*