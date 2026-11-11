# DineSmart — Architecture & Flow Document (v2)

> **Architecture style:** EasyDiner-style marketplace + commission + settlement
> **Last updated:** 2026-06-30
> **Stack:** React Native · React/Vite · Node.js/Express · MongoDB · Razorpay

---





## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          DINESMART PLATFORM                               │
│                                                                           │
│  📱 Mobile App    🌐 Web App     👨‍💼 Owner Panel    🛡️ Admin Panel         │
│  React Native   React/Vite      React/Vite        React/Vite             │
│  (Customer)     (Customer)      (Restaurant)      (Platform admin)       │
│                                                                           │
│                      ↕ REST API  /api/*  (port 5000)                     │
│                                                                           │
│   Node.js + Express                                                       │
│   ├── Auth · User · Restaurant · Branch · Table · Menu                   │
│   ├── Booking (hold → confirm) · Offer (approval flow)                   │
│   ├── Payment (Razorpay · Wallet) · BillPayment                          │
│   ├── Invoice · DiscountLedger · Commission · Settlement                 │
│   └── Notification · Review · Admin                                      │
│                                                                           │
│   MongoDB (Mongoose)                                                      │
│   Nginx (reverse proxy + SSL)  ·  Docker Compose                         │
└──────────────────────────────────────────────────────────────────────────┘
```

### Port Map

| Service | Port | Notes |
|---------|------|-------|
| Backend API | 5000 | All `/api/*` routes |
| Web App | 3000 | Customer browser |
| Owner Panel | 3001 | Restaurant owner |
| Admin Panel | 3002 | Platform admin |
| Nginx | 80 / 443 | Reverse proxy, SSL termination |

---

## 2. User Roles

| Role | Entry point | Core responsibility |
|------|------------|---------------------|
| **Customer** | Mobile / Web | Search, book, pay bill, review |
| **Restaurant Owner** | Owner Panel | Menu, tables, offers, bookings, invoices |
| **Admin** | Admin Panel | Approve restaurants & offers, settle commissions |

---

## 3. Authentication Flow

```
App Open
   │
   ▼
SplashScreen
   │
   ├─ has valid JWT? ──→ Home (role-based)
   │
   └─ no token
       │
       ▼
   OnboardingScreen
       │
   ┌───┴────────────────────┐
   │                        │
Login                   Register
   │                        │
   │                   Phone/Email OTP
   │                        │
   │                   Verify OTP
   │                        │
   └──── JWT issued ─────────┘
              │
   role-based redirect:
   ├── customer  → Customer Home
   ├── owner     → Owner Dashboard
   └── admin     → Admin Dashboard

Forgot Password:
  Login → Forgot Password → Enter Email → OTP → Reset Password → Login
```

---

## 4. Offer / Discount Flow  ★ NEW

### 4.1 Offer Creation & Approval

```
Restaurant Owner
   │
   ▼
Create Offer
   ├── title, code, type (percentage / flat / bogo / …)
   ├── discountValue, maxDiscount, minOrderAmount
   ├── fundedBy: restaurant | platform | bank | combined
   │       └─ if combined → fundingBreakup { restaurantPercent, platformPercent, bankPercent }
   ├── validFrom / validTo / validDays
   ├── usageLimit (total + per-user)
   └── applicableTo: ['booking'] | ['pay_bill'] | both
         │
         ▼
   discountPolicy.requiresApproval ?
         │
   YES ──┤   approvalStatus = 'pending_approval'
         │   Admin gets notification
         │        │
         │        ▼
         │   Admin reviews
         │   ├── APPROVE → approvalStatus = 'approved'
         │   │             Owner notified (offer_approved)
         │   │             Offer published
         │   └── REJECT  → approvalStatus = 'rejected'
         │                  Owner notified (offer_rejected) + reason
         │
   NO   ──┘   approvalStatus = 'approved' (auto)
              Offer published immediately
```

### 4.2 Customer Applies Offer

```
Customer at Booking / Pay Bill screen
   │
   ▼
Enter offer code  (or select from available offers)
   │
   ▼
Backend: offer.isValid(userId, orderAmount, guests)
   ├── approvalStatus === 'approved'? ✓
   ├── isActive? ✓
   ├── within validFrom–validTo? ✓
   ├── orderAmount ≥ minOrderAmount? ✓
   ├── usedCount < totalUsageLimit? ✓
   └── userUses < perUserLimit? ✓
         │
         ▼
offer.calculateDiscount(amount)
   → { totalDiscount, restaurantFunded, platformFunded, bankFunded }
         │
         ▼
DiscountLedger record created
         │
         ▼
Invoice / BillPayment: discountBreakup populated
```

### 4.3 Discount Funding Rules

| fundedBy | Effect on owner earnings | Effect on commission base |
|----------|--------------------------|--------------------------|
| `restaurant` | Reduces earnings | Reduces commission base |
| `platform` | No reduction | No reduction |
| `bank` | No reduction | No reduction |
| `combined` | Only restaurantFunded portion | Only restaurantFunded portion |

---

## 5. Booking Flow  ★ UPDATED

```
Customer selects Restaurant / Branch
   │
   ▼
Select Date · Time · Guests · Occasion
   │
   ▼
Table Availability Check (real-time)
   ├── conflict found → show alternative slots
   └── available
         │
         ▼
   TEMPORARY HOLD (5 minutes)
   Booking status  = 'held'
   holdStatus      = 'held'
   holdExpiresAt   = now + 5 min
   Table is locked → prevents double booking
         │
         ▼
   Deposit required? (restaurant.bookingSettings.depositRequired)
         │
   YES ──┤
         │   Payment Screen (Razorpay / Wallet)
         │        │
         │   paid ─┤  Booking status = 'pending'
         │         │  holdStatus     = 'confirmed'
         │ failed  └─ hold released, booking cancelled
         │
   NO   ──┘  Booking status = 'pending' immediately
         │
         ▼
   Owner Panel: new booking alert (notification)
         │
   Owner ACCEPTS → status = 'confirmed'   (customer notified)
   Owner REJECTS → status = 'cancelled'   (customer notified + refund)
         │
         ▼
   Day of booking — Customer arrives
   Owner marks → status = 'seated'
         │
         ▼
   Meal complete
   Owner marks → status = 'completed'
         │
         ▼
   Invoice LOCKED (isLocked = true)
   Commission record created
   Review prompt sent to customer
```

### Booking Status Lifecycle

```
held ──(deposit paid / no deposit)──→ pending
                                         │
                              confirmed ←┤ owner accepts
                                         │
                              seated ←───┤ customer arrives
                                         │
                              completed ←┘ meal done
                                         │
               cancelled ←──────────────┤ (any stage, by owner/customer)
               no-show  ←───────────────┘ (customer didn't arrive)
               rescheduled
```

### Hold Auto-Release (cron)

```
Every 1 minute (cron job):
  Find bookings where:
    holdStatus = 'held'  AND  holdExpiresAt < now
  → Set status = 'cancelled', holdStatus = 'released'
  → Free the table
```

---

## 6. Payment Flow

```
Customer initiates payment
      │
 ┌────┴──────────────┬──────────────────┐
 │                   │                  │
Razorpay          Wallet            Cash/Card
 │                   │              (at venue)
 │             Check balance              │
 │             sufficient?               ▼
 │             YES → debit           isPaid = true
 │             NO  → top-up wallet   status = completed
 │
 ▼
Create Razorpay Order  (backend)
 │
 ▼
Customer completes payment on Razorpay SDK
 │
 ▼
Backend verifies signature (razorpaySignature)
 │
 ▼
Payment.status = 'completed'
Booking.isPaid = true
 │
 ▼
Deposit type  → booking deposit recorded
Full type     → invoice marked paid
```

**Refund:**
```
Booking cancelled + isPaid
  → Razorpay refund (razorpayPaymentId)  OR  Wallet credit
  → DiscountLedger entry reversed (status = 'reversed')
  → Notification: refund_completed
```

---

## 7. Invoice & Commission Calculation  ★ UPDATED

### Amount Chain

```
grossAmount          ← full food bill (before any discount / tax)
   │
   ├── ownerDiscount    ← restaurantFunded portion of discount
   ├── platformDiscount ← platformFunded portion (not subtracted from owner)
   └── bankDiscount     ← bankFunded portion (not subtracted from owner)
         │
netCustomerPays = grossAmount − totalDiscount + taxAmount

commissionBase   = grossAmount − ownerDiscount
commissionAmount = commissionBase × commissionRate / 100
restaurantReceivable = commissionBase − commissionAmount
```

### Example

| Scenario | Value |
|----------|-------|
| grossAmount | ₹1,000 |
| Offer: 20% funded by restaurant | ownerDiscount = ₹200 |
| Offer: 10% funded by platform | platformDiscount = ₹100 |
| netPaid by customer | ₹700 + GST |
| commissionBase | ₹1,000 − ₹200 = **₹800** |
| Commission @10% | **₹80** |
| restaurantReceivable | ₹800 − ₹80 = **₹720** |

Platform absorbs ₹100 (its own funded discount) separately.

---

## 8. Bill Payment Flow  ★ UPDATED

```
Customer at restaurant (after meal)
   │
   ▼
Mobile App → Pay Bill Screen
   │
   ▼
Scan QR code  OR  enter restaurant code
   │
   ▼
Fetch bill from restaurant POS / owner entry
billStatus = 'open'
   │
   ▼
Apply Offer (optional)
   ├── validate offer (isValid)
   ├── calculateDiscount → discountBreakup
   └── billStatus = 'preview'
         │
         ▼
Preview screen:
   bill amount, discount breakup, final amount, payment method
         │
         ▼
Customer confirms → Payment (Razorpay / Wallet)
         │
   ┌─────┴──────────┐
   │                │
 Success          Failed
   │                │
billStatus='paid' billStatus='open'  ← customer can retry
paymentRef saved  Notification: payment_failed
   │
   ▼
Invoice auto-generated
Commission record created
   │
   ▼
Notification: receipt sent to customer
```

---

## 9. Settlement Flow  ★ UPDATED

```
Booking / BillPayment completed
   │
   ▼
Invoice LOCKED  (isLocked = true, status = 'locked')
   │
   ▼
Commission record created  (status = 'pending')
Invoice: settlementStatus = 'pending'
   │
   ▼
── Admin Settlement Cycle (daily/weekly/biweekly/monthly per restaurant) ──
   │
   ▼
Admin triggers settlement batch for Restaurant X
   │
   ▼
System aggregates all pending commissions for X in period:
   totalGrossAmount     = Σ invoice.grossAmount
   totalOwnerDiscount   = Σ discountBreakup.restaurantFunded
   totalPlatformDiscount= Σ discountBreakup.platformFunded
   totalCommission      = Σ commission.amount
   ownerReceivable      = Σ invoice.restaurantReceivable
   │
   ▼
Settlement created  (status = 'pending')
   │
   ▼
Status: pending → processing
   (commissions and invoices marked 'included')
   │
   ▼
Status: processing → generated
   (settlement report finalized, sent to restaurant)
   │
   ▼
Admin transfers payment to restaurant bank account
Status: generated → paid
   paidAt, transactionRef, paymentMethod recorded
   Notification: settlement_completed → owner
   Commission status → 'settled'
   Invoice settlementStatus → 'settled'
   │
   ▼  (on failure)
Status: → failed
   failureReason recorded
   Notification: settlement_failed → owner + admin
```

### Settlement Status Lifecycle

```
pending → processing → generated → paid
                                    │
                    failed ←────────┘  (retry possible)
```

---

## 10. Admin Panel — New Features  ★ UPDATED

```
Admin Dashboard
   │
   ├── 🏪 Restaurant Management
   │       Approve / Reject / Suspend
   │       Set commission%, commissionType, settlementCycle
   │       Set discountPolicy (requiresApproval, maxPlatformFundedPercent)
   │
   ├── 🏷️ Offer Approval Queue
   │       pending_approval offers → Approve / Reject with reason
   │       Offer analytics: usage count, funded amounts
   │
   ├── 💰 Commission Dashboard
   │       Per-restaurant pending commissions
   │       Date range filter
   │       Commission formula audit (grossAmount, ownerDiscount, base, %)
   │
   ├── 💵 Settlement Dashboard
   │       Pending → Processing → Generated → Paid
   │       Batch settle per restaurant
   │       Settlement history & export
   │
   ├── 📊 Discount Analytics
   │       Platform-funded discount total (DineSmart cost)
   │       Restaurant-funded discount total
   │       Bank-funded discount total
   │       Offer performance (usage, conversion, revenue impact)
   │
   ├── 📈 Revenue Analytics
   │       GMV (Gross Merchandise Value = Σ grossAmount)
   │       Net revenue after discounts
   │       Commission earned
   │       Settlement disbursed vs pending
   │
   ├── 👥 User Management
   ├── 📅 All Bookings
   └── 🔔 Notifications (send to users/owners)
```

---

## 11. Notification Events  ★ UPDATED

| Event type | Sent to | Trigger |
|-----------|---------|---------|
| `booking_confirmed` | Customer | Owner confirms booking |
| `booking_cancelled` | Customer | Booking cancelled by owner/customer |
| `booking_reminder` | Customer | Day before booking date |
| `booking_no_show` | Owner | Customer marked no-show |
| `payment_failed` | Customer | Razorpay/Wallet payment fails |
| `refund_completed` | Customer | Refund processed after cancellation |
| `deposit_received` | Owner | Customer pays deposit |
| `offer_approved` | Owner | Admin approves offer |
| `offer_rejected` | Owner | Admin rejects offer (includes reason) |
| `settlement_completed` | Owner | Admin marks settlement as paid |
| `settlement_failed` | Owner + Admin | Settlement payment fails |

---

## 12. Data Model Relationships

```
User
 ├── owns → Restaurant
 │             ├── commissionType, settlementCycle, discountPolicy  (NEW)
 │             ├── Branch[]
 │             ├── Table[]
 │             ├── Menu[]
 │             └── Offer[]  (fundedBy, approvalStatus)  (UPDATED)
 │
 └── makes → Booking
               ├── holdExpiresAt, bookingSource  (NEW)
               ├── links → Restaurant / Branch / Table
               ├── Payment
               └── Invoice  (UPDATED)
                     ├── grossAmount, discountBreakup (restaurantFunded / platformFunded / bankFunded)
                     ├── commissionBase, commissionAmount, restaurantReceivable
                     ├── settlementStatus
                     └── Commission  (UPDATED: grossAmount, ownerDiscount, commissionBase)
                                          └── Settlement  (UPDATED: history, ownerReceivable, paid/failed)

DiscountLedger  (NEW)
 ├── links → Offer + Customer + Restaurant
 ├── sourceType: booking | bill_payment
 └── restaurantFunded / platformFunded / bankFunded / totalDiscount

BillPayment  (UPDATED)
 ├── billStatus: open → preview → paid
 ├── discountBreakup  (same structure as Invoice)
 ├── paymentReference
 └── Invoice (generated after payment)
```

---

## 13. Backend Folder Structure

```
backend/src/
├── app.js
├── server.js
├── config/
│   └── db.js
├── models/
│   ├── User.js
│   ├── Restaurant.js        ← commissionType, settlementCycle, discountPolicy
│   ├── Branch.js
│   ├── Table.js
│   ├── Menu.js
│   ├── Offer.js             ← fundedBy, approvalStatus, approvalHistory  ★
│   ├── Booking.js           ← holdExpiresAt, bookingSource, holdStatus    ★
│   ├── Payment.js
│   ├── Invoice.js           ← grossAmount, discountBreakup, settlementStatus ★
│   ├── BillPayment.js       ← billStatus, discountBreakup, paymentReference  ★
│   ├── Commission.js        ← grossAmount, ownerDiscount, commissionBase     ★
│   ├── Settlement.js        ← history, ownerReceivable, paid/failed statuses ★
│   ├── DiscountLedger.js    ← NEW — audit trail for every discount applied   ★
│   ├── Notification.js      ← new event types                                ★
│   ├── Review.js
│   └── Wallet.js
├── routes/
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── restaurant.routes.js
│   ├── branch.routes.js
│   ├── table.routes.js
│   ├── menu.routes.js
│   ├── offer.routes.js          ← add: POST /approve, POST /reject  ★
│   ├── booking.routes.js        ← add: POST /hold, DELETE /hold/:id  ★
│   ├── payment.routes.js
│   ├── billPayment.routes.js    ← add: GET /preview, PATCH /:id/status  ★
│   ├── invoice.routes.js        ← add: POST /:id/lock  ★
│   ├── commission.routes.js
│   ├── settlement.routes.js     ← add: PATCH /:id/status, GET /reports  ★
│   ├── review.routes.js
│   ├── notification.routes.js
│   └── admin.routes.js          ← add: commission dashboard, discount analytics ★
├── controllers/   (mirrors routes)
├── services/
│   ├── commission.service.js    ← NEW: calculates commission with new formula  ★
│   ├── settlement.service.js    ← NEW: batch settlement generation             ★
│   ├── discount.service.js      ← NEW: applies offer, writes DiscountLedger    ★
│   ├── holdRelease.service.js   ← NEW: cron job logic for expired holds        ★
│   └── notification.service.js
├── middleware/
├── utils/
└── validators/
```

---

## 14. API Changes Summary  ★ UPDATED

### Offer Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/offers` | Create offer (owner) |
| GET | `/api/offers` | List offers (filter by approvalStatus) |
| PATCH | `/api/offers/:id/submit` | Submit offer for admin approval |
| PATCH | `/api/offers/:id/approve` | Admin approves offer |
| PATCH | `/api/offers/:id/reject` | Admin rejects offer (+ reason) |
| GET | `/api/offers/:id/usage` | Usage stats for an offer |

### Booking Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bookings/hold` | Create temporary hold (5 min) |
| DELETE | `/api/bookings/hold/:id` | Release a hold early |
| POST | `/api/bookings` | Confirm booking (after hold + optional deposit) |
| PATCH | `/api/bookings/:id/status` | Update status (confirm/seat/complete/cancel) |

### Invoice Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/invoices` | Generate invoice (owner) |
| PATCH | `/api/invoices/:id/lock` | Lock invoice after booking complete |
| GET | `/api/invoices/:id` | Get invoice with discountBreakup |

### Settlement Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/settlements` | Admin: generate settlement for restaurant + period |
| PATCH | `/api/settlements/:id/status` | Admin: advance status (processing/generated/paid/failed) |
| GET | `/api/settlements` | List settlements (filter: restaurant, status, period) |
| GET | `/api/settlements/:id/report` | Full settlement report with line items |

### Admin Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/commissions` | Commission dashboard (pending, by restaurant) |
| GET | `/api/admin/settlements` | Settlement dashboard |
| GET | `/api/admin/discount-analytics` | Platform vs restaurant funded totals |
| GET | `/api/admin/revenue-analytics` | GMV, net revenue, commission earned |
| GET | `/api/admin/offers/pending` | Offers awaiting approval |

### BillPayment Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bill-payments/fetch` | Fetch bill by QR/code (billStatus = open) |
| POST | `/api/bill-payments/:id/apply-offer` | Apply offer → preview |
| POST | `/api/bill-payments/:id/pay` | Pay bill |
| GET | `/api/bill-payments/:id` | Get bill payment (with paymentReference) |

---

## 15. Frontend Panel Updates

### Owner Panel — New Pages

| Page | Description |
|------|-------------|
| `Offers → Create Offer` | fundedBy selector, fundingBreakup when combined |
| `Offers → Offer Status` | Shows approval status badge (pending/approved/rejected) |
| `Invoices → Invoice Detail` | Shows discountBreakup (who funded what) |
| `Settlement → Settlement History` | Status timeline, ownerReceivable amount |
| `Reports → Revenue Report` | Updated formula: commission on commissionBase |

### Admin Panel — New Pages

| Page | Description |
|------|-------------|
| `Offers → Approval Queue` | List of pending_approval offers, approve/reject UI |
| `Commission Dashboard` | Per-restaurant commission summary, pending vs settled |
| `Settlement Dashboard` | Batch settlement, status pipeline (pending→paid) |
| `Discount Analytics` | Platform cost (platformFunded totals) |
| `Revenue Analytics` | GMV, net, commission, disbursed |

---

*v2 — EasyDiner-style marketplace architecture | DineSmart*
