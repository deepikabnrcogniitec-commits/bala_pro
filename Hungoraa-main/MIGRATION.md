# DineSmart — Migration Plan (v1 → v2)

> EasyDiner-style marketplace + commission + settlement architecture

---

## Overview

This migration upgrades 6 existing schemas and adds 1 new model.
All changes are **additive** (new fields with defaults) — existing documents
remain valid without any data rewrite for Phase 1.
Phase 2 backfills computed fields for historical accuracy.

---

## Phase 1 — Schema Migration (zero downtime, deploy first)

All new fields have safe defaults. Deploy new backend code; existing documents
auto-satisfy the new schema on next read/save.

### 1.1 Restaurant

```javascript
// Add to existing documents (defaults handle missing values)
commissionType:    'percentage'        // existing commission field already %
settlementCycle:   'weekly'
discountPolicy: {
  requiresApproval:          false,
  maxPlatformFundedPercent:  0,
  autoApproveBelow:          0,
}
```

### 1.2 Offer

```javascript
// New fields with backward-compat defaults
fundedBy:          'restaurant'        // existing offers were always owner-funded
approvalRequired:  false
approvalStatus:    'approved'          // existing offers treated as already approved
fundingBreakup:    { restaurantPercent: 100, platformPercent: 0, bankPercent: 0 }
approvalHistory:   []
```

**No existing offer breaks.** `offer.isValid()` still works; `calculateDiscount()`
now returns `{ totalDiscount, restaurantFunded, platformFunded, bankFunded }` instead
of a plain number — update all callers.

### 1.3 Booking

```javascript
holdExpiresAt:   undefined          // only set when holdStatus = 'held'
holdStatus:      'none'
bookingSource:   'mobile'
```

`status` enum gains `'held'` — no existing bookings have this value, no conflict.

### 1.4 Invoice

```javascript
// grossAmount replaces the role of subtotal (subtotal field removed)
grossAmount:          existing.subtotal ?? 0
discountBreakup: {
  restaurantFunded:  existing.discountAmount ?? 0,   // assumed restaurant-funded
  platformFunded:    0,
  bankFunded:        0,
  total:             existing.discountAmount ?? 0,
}
netPaid:              existing.finalAmount ?? 0
commissionBase:       existing.subtotal - (existing.discountAmount ?? 0)
commissionAmount:     existing.commissionAmount      // will be recomputed in Phase 2
restaurantReceivable: existing.restaurantReceives ?? 0
settlementStatus:     'pending'
isLocked:             existing.status === 'paid'
```

> **Breaking change:** `finalAmount` is no longer stored — use `netPaid`.
> Update all frontend/controller references.

### 1.5 Commission

```javascript
grossAmount:       invoice.subtotal ?? 0
ownerDiscount:     invoice.discountAmount ?? 0
platformDiscount:  0
commissionBase:    grossAmount - ownerDiscount
// amount stays the same — recomputed in Phase 2
```

Status enum gains `'included'` between `pending` and `settled`.

### 1.6 Settlement

```javascript
invoices:              []                 // backfilled in Phase 2
totalGrossAmount:      0                 // backfilled in Phase 2
totalOwnerDiscount:    0
totalPlatformDiscount: 0
ownerReceivable:       existing.netPayable
settlementHistory:     [{ status: existing.status, timestamp: existing.updatedAt }]
paymentMethod:         undefined
paidAt:                existing.completedAt
failureReason:         undefined
```

Status enum changes: `'completed'` → `'paid'`.
**One-time rename:** `UPDATE settlements SET status='paid' WHERE status='completed'`

### 1.7 BillPayment

```javascript
billStatus:       existing.paymentStatus === 'paid' ? 'paid' : 'open'
discountBreakup: {
  restaurantFunded: existing.discountAmount ?? 0,
  platformFunded:   0,
  bankFunded:       0,
  total:            existing.discountAmount ?? 0,
}
paymentReference: undefined
commissionBase:   existing.billAmount - (existing.discountAmount ?? 0)
// commissionAmount stays same
```

> **Removed fields:** `discountPercentage`, `discountAmount` (use `discountBreakup`).

### 1.8 Notification

Enum gains new values — existing documents unaffected.

---

## Phase 2 — Data Backfill (run after Phase 1 deploy)

Run these scripts during low-traffic window. Each script is idempotent.

### Script 1 — Recompute Invoice commission fields

```javascript
// scripts/backfill-invoice-commission.js
const Invoice = require('../src/models/Invoice');

const invoices = await Invoice.find({ isLocked: true });
for (const inv of invoices) {
  const ownerDiscount = inv.discountBreakup?.restaurantFunded ?? 0;
  inv.commissionBase    = Math.max(0, inv.grossAmount - ownerDiscount);
  inv.commissionAmount  = parseFloat((inv.commissionBase * inv.commissionPercentage / 100).toFixed(2));
  inv.restaurantReceivable = parseFloat((inv.commissionBase - inv.commissionAmount).toFixed(2));
  await inv.save();
}
```

### Script 2 — Recompute Commission fields

```javascript
// scripts/backfill-commission.js
const Commission = require('../src/models/Commission');
const Invoice    = require('../src/models/Invoice');

const commissions = await Commission.find().populate('invoice');
for (const c of commissions) {
  const inv = c.invoice;
  if (!inv) continue;
  c.grossAmount    = inv.grossAmount;
  c.ownerDiscount  = inv.discountBreakup?.restaurantFunded ?? 0;
  c.commissionBase = inv.commissionBase;
  c.amount         = inv.commissionAmount;
  await c.save();
}
```

### Script 3 — Rename Settlement status

```javascript
// scripts/backfill-settlement-status.js
const Settlement = require('../src/models/Settlement');
await Settlement.updateMany({ status: 'completed' }, { $set: { status: 'paid' } });
```

### Script 4 — Link Invoices to Settlements

```javascript
// scripts/backfill-settlement-invoices.js
const Settlement = require('../src/models/Settlement');
const Commission  = require('../src/models/Commission');

const settlements = await Settlement.find().populate('commissions');
for (const s of settlements) {
  const invoiceIds = s.commissions.map(c => c.invoice).filter(Boolean);
  s.invoices = [...new Set(invoiceIds.map(String))];
  await s.save();
}
```

---

## Phase 3 — New Model (DiscountLedger)

DiscountLedger has no historical data — it starts empty.
New offer applications from go-live onwards create ledger entries automatically.

**Optional backfill** (for analytics completeness):

```javascript
// scripts/backfill-discount-ledger.js
// For every paid Invoice that has an offer applied,
// create a DiscountLedger entry marked as 'applied'
const Invoice        = require('../src/models/Invoice');
const DiscountLedger = require('../src/models/DiscountLedger');

const invoices = await Invoice.find({ offer: { $exists: true, $ne: null } });
for (const inv of invoices) {
  const exists = await DiscountLedger.findOne({ sourceType: 'booking', sourceId: inv.booking });
  if (exists) continue;
  await DiscountLedger.create({
    offer:            inv.offer,
    customer:         inv.customer,
    restaurant:       inv.restaurant,
    sourceType:       'booking',
    sourceId:         inv.booking,
    offerCode:        inv.offerCode,
    grossAmount:      inv.grossAmount,
    restaurantFunded: inv.discountBreakup?.restaurantFunded ?? 0,
    platformFunded:   inv.discountBreakup?.platformFunded   ?? 0,
    bankFunded:       inv.discountBreakup?.bankFunded        ?? 0,
    totalDiscount:    inv.discountBreakup?.total             ?? 0,
    status:           'applied',
    appliedAt:        inv.createdAt,
  });
}
```

---

## Phase 4 — Frontend Updates

### Owner Panel

- [ ] Offer create form: add `fundedBy` dropdown + `fundingBreakup` sliders (shown when `combined`)
- [ ] Offer list: show `approvalStatus` badge
- [ ] Invoice detail: show `discountBreakup` table (restaurant / platform / bank)
- [ ] Settlement page: show `ownerReceivable`, status timeline
- [ ] Replace all references to `finalAmount` → `netPaid`

### Admin Panel

- [ ] Add **Offer Approval Queue** page (GET `/api/admin/offers/pending`)
- [ ] Add **Commission Dashboard** page
- [ ] Add **Settlement Dashboard** with status pipeline
- [ ] Add **Discount Analytics** page
- [ ] Add **Revenue Analytics** page (GMV, net, commission)

### Mobile / Web App

- [ ] Offer application: show discount breakup in confirmation (optional, UX decision)
- [ ] Booking flow: show hold timer countdown (5 min)
- [ ] Bill Payment: `billStatus` UI states (open → preview → paid)

---

## Breaking Changes Checklist

| Change | Action required |
|--------|----------------|
| `Invoice.finalAmount` removed → `netPaid` | Update all controllers + frontend |
| `Invoice.subtotal` → `grossAmount` | Rename in owner panel invoice views |
| `Invoice.restaurantReceives` → `restaurantReceivable` | Update settlement service |
| `Settlement.status` `completed` → `paid` | DB rename script (Phase 2 Script 3) |
| `Commission.status` adds `included` | No break; just a new valid value |
| `Offer.calculateDiscount()` returns object | Update all callers to destructure |
| `BillPayment.discountAmount` removed | Use `discountBreakup.total` |
| `BillPayment.discountPercentage` removed | Derive from offer if needed |

---

## Deployment Order

```
1. Deploy new backend (Phase 1) — additive fields, safe defaults
2. Smoke test: create booking, apply offer, generate invoice
3. Run Phase 2 backfill scripts (off-peak)
4. Run Phase 3 DiscountLedger backfill (optional)
5. Deploy updated Owner Panel
6. Deploy updated Admin Panel
7. Deploy updated Mobile / Web builds
```

---

*Migration Plan v1 → v2 | DineSmart*
