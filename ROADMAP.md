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

---

## Phase 3 — Improve Projection Quality

**Goal:** Make suggestions smarter by learning from real behavior.

- Track accept / reject / modify behavior per vendor per order
- Tune suggestion logic per vendor using that behavioral data
- Add lightweight day-of-week and seasonality weighting where it makes sense
- Add low-friction comparison and reference tools if needed (do not over-engineer)

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
