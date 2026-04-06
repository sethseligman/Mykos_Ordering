# Mykos Ordering — Product Roadmap

> This document is the north star for development. Refer to it before starting any new work. Do not skip phases or build features out of sequence.

---

## Phase 1 — Stabilize + Persist

**Goal:** Make the existing 3-vendor workflow trustworthy and mobile-usable. Nothing in later phases is stable without this foundation.

- Put project in GitHub and use feature branches for all new work
- Add a minimal Supabase persistence layer for:
  - Vendor settings / config
  - Order drafts
  - Finalized orders / history
  - Execution log
- Validate the current 3-vendor workflow (D'Artagnan, Ace/Endico, Optima) end to end on top of the new persistence layer
- Mobile/tablet responsiveness treated as a **parallel requirement**, not a feature — every screen built or modified must work on a phone/tablet

---

## Phase 2 — Operationalize the Platform

**Goal:** Make it easy to manage vendors and catalogs without touching code.

- Finish vendor admin CRUD — built on top of the Phase 1 persistence layer
- Build catalog import script: CSV/XLSX → `vendor_catalog_items` table
  - Maps item name, SKU, unit, pack size, price
  - Deduplicates on re-import
  - Flags items that disappeared vs. last import
- Add new vendors gradually using the import + CRUD flow
- Ensure vendor settings, scheduling rules, and outbound behavior are fully coherent across all vendors
- Document a repeatable "how to add a vendor" process (even informal) before adding vendor 4+

## Known UX Debt (Clear before Phase 3)

### Mobile header cleanup (all order sheets + GenericVendorWorkspace)
- Remove rep name from header — lives in Settings tab only
- Remove "Greeting" field from order sheet header — belongs in Settings
- Remove redundant Channel display from metadata bar (already in header)
- Move Delivery Date up directly below vendor name — it's the 2nd most
  important field and is currently buried
- Drop "Order Checklist" label — redundant given tab context
- Clean header hierarchy: Vendor Name · Channel → Delivery Date → 
  Status badge → Tabs

### Status badge logic
- Badge on open should always be "Draft" regardless of history state
- History pre-population does not constitute a ready order
- Badge progression: Draft → Ready (after generate) → Sent
- Remove "Generated 08:17 PM" timestamp — meaningless at a glance
- Sent timestamp only shown after status = Sent

### Sticky bottom bar fix
- Root cause: overflow-hidden on shell div kills sticky positioning
- Fix: swap overflow-hidden → overflow-clip on shellClass in
  AceEndicoOrderSheet, OptimaOrderSheet, DartagnanOrderSheet
- GenericVendorWorkspace sticky bar is outside the card div so
  structurally correct — if still broken check App.tsx for
  overflow-hidden on page wrapper

### Desktop action bar
- Bottom bar gets lg:hidden — does not belong on desktop
- Save + Finalize buttons move into right-rail OrderCartSummaryPanel
  on lg+ breakpoint

### History pre-population — change default behavior
- Order sheets should open BLANK by default (zero items checked)
- Chef initiates population explicitly via "Build from history" button
- Rationale: pre-population leads to complacency, over-ordering,
  missed items; blank start keeps chef in the loop
- "Apply from history" → rename to "Build from history"
- "Clear all" remains but visually secondary to "Build from history"
- Draft save behavior: if chef does not save, sheet resets to blank
  on next open

### Last Order (LO) toggle — Phase 3, not now
- Small "LO" button to the left of QTY column on checklist
- Tap reveals last order quantities as ghost layer (grey, italic,
  smaller font) beside every qty input
- Tap again to hide — opt-in, zero default real estate cost
- Hold until sufficient real order history exists to avoid empty states

---

## Phase 3 — Improve Projection Quality

**Goal:** Make suggestions smarter by learning from real behavior.

- Track accept / reject / modify behavior per vendor per order
- Tune suggestion logic per vendor using that behavioral data
- Add lightweight day-of-week and seasonality weighting where it makes sense
- Add low-friction comparison and reference tools if needed (do not over-engineer)
- Chat/SMS import for catalog building: allow users to upload 
  a PDF or text export of their vendor SMS/iMessage history. 
  Use Claude API to parse conversation and extract a structured 
  product catalog (name, unit, pack_size). Same preview/confirm 
  flow as CSV import. Add as Step 3 Card C in the Add Vendor wizard.

---

## Phase 4 — Automate Execution

**Goal:** Reduce the manual work of placing orders, carefully and in order.

- Email sending first — easier to audit, more forgiving than SMS
- Structured SMS only where it truly makes sense (do not rush this — the build/place flow must be fully stable first)
- Portal / API vendor workflows where vendors support it
- Place-all-orders queue (later, once individual send flows are proven)

---

## Phase 5 — Intelligence Layer

**Goal:** Move from reactive ordering to proactive management.

- Parse inbound vendor confirmations to auto-update history
- Cut-off warnings and deadline awareness
- Anomaly detection (e.g. "you usually order 7 gallons of milk — today you have 2, is that right?")
- Replenishment and cadence logic for low-frequency items
- Multi-restaurant / SaaS architecture layer (enabled by the auth/multi-tenancy schema designed in Phase 1)
- Build platform-managed master catalogs for common vendors (Baldor, Sysco, US Foods, Chef's Warehouse, Ace/Endico, D'Artagnan, etc.). New restaurants select their subset on vendor onboarding. Powers the "Use platform catalog" option in the Add Vendor wizard Step 3.

---

## Core Architecture Insight — Worksheets vs Vendors

The app currently maps one vendor to one order sheet. 
This does not reflect how a real kitchen operates.

Real structure:
- Worksheets = how a chef thinks (Meat, Produce, Dry Goods)
- Vendors = who supplies the items
- Relationship = many-to-many and fluid

Examples:
- Meat worksheet → D'Artagnan + PFD + sometimes Baldor
- Produce worksheet → Baldor + MFE + seasonal farmers
- Dry Goods worksheet → Ace/Endico + Baldor + Sogno + La Boite
- Greek Imports worksheet → Optima + Baldor (kataifi)

This means:
- A worksheet shows all items across assigned vendors
- Each item is tagged with which vendor supplies it
- The chef orders from multiple vendors within one worksheet
- Vendor assignment per item can change (e.g. switch kataifi 
  from Optima to Baldor)

Phase 3 work required:
- Introduce `worksheets` as a first-class database entity
- Add vendor_id to each catalog item (already exists)
- Allow multiple vendors per worksheet
- Order placement sends separate messages per vendor 
  within the worksheet
- Suggestion engine works at worksheet level, 
  not vendor level

---

## Architecture Principles

These rules apply across all phases. Do not violate them.

| Rule | Meaning |
|------|---------|
| Catalog comes from the order sheet / import | No SKUs invented anywhere else |
| History comes from real orders | Not inferred from catalog metadata |
| Suggestions come from history | Not from catalog alone |
| Full catalog is always rendered | Suggestions only set `included` / `quantity` |
| History must not expand the catalog | Unknown SKUs in history are ignored until added to the sheet |

---

## Schema (Phase 1 target)

- `restaurants` — multi-tenancy root
- `vendors` — per restaurant, replaces static `portalVendors` array
- `vendor_catalog_items` — populated by import script, editable after
- `order_drafts` — in-progress orders
- `finalized_orders` — sent orders with full line items
- `execution_log` — every send action with vendor, method, destination, timestamp, status

---

*Last updated: April 2026*
