# Phase 0: Wireframes & Screen List

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Primary BG (sidebar) | #1a1a2e | Staff/admin sidebar, dark areas |
| Accent | #ff6b35 | Buttons, active states, highlights |
| Accent hover | #e55a2b | Button hover |
| Content BG | #f5f5f5 | Main content area background |
| Card BG | #ffffff | Cards, modals |
| Text primary | #1a1a2e | Headings, body text |
| Text secondary | #6b7280 | Labels, hints |
| Success | #10b981 | Approved, online, served |
| Warning | #f59e0b | Expiring, bill requested |
| Danger | #ef4444 | Rejected, expired, sold out |
| Veg badge | #22c55e | Green circle |
| Non-veg badge | #ef4444 | Red triangle |
| Border radius | 12px | Cards, buttons |
| Font | Inter | All text |

## Customer App Screens (Mobile-first PWA)

### 1. QR Landing Page
- **Route**: `/c/{slug}?t={token}`
- **Phase**: 3
- **Layout**: Full-screen mobile
- **Components**: Cafe logo + cover image hero, cafe name, "Start Ordering" button (orange), "Coming soon" overlay if not approved
- **States**: Loading, cafe not found, not approved, approved

### 2. Customer Login
- **Route**: `/c/{slug}/login`
- **Phase**: 3
- **Components**: Name input, phone input (+91 prefix), consent checkbox with text, "Send OTP" button, OTP input (6 digits), verify button
- **Notes**: Skip if already authenticated on device

### 3. Session PIN Entry
- **Route**: `/c/{slug}/join`
- **Phase**: 4
- **Components**: "Join existing table" heading, PIN input (4-6 digits), "Join Cart" button
- **Notes**: Only shown when joining someone else's session

### 4. Menu Page
- **Route**: `/c/{slug}/menu`
- **Phase**: 3
- **Components**: Search bar, category tabs (horizontal scroll), item cards (image, name, price, veg/non-veg badge, sold-out overlay), "Add" button per item, cart floating button with count + total, dietary filter chips (veg only, jain)
- **Layout**: Category tabs on top, scrollable item grid below

### 5. Item Detail
- **Route**: `/c/{slug}/menu/{itemId}` (or modal)
- **Phase**: 3
- **Components**: Large item image, name, description, price, veg/non-veg badge, allergen info, spicy level indicator, option groups (radio for required single-select, checkboxes for optional multi-select with extra price), quantity selector, special instructions textarea, "Add to Cart" button with total
- **Layout**: Bottom sheet or full page

### 6. Cart
- **Route**: `/c/{slug}/cart`
- **Phase**: 3 (shared: 4)
- **Components**: Cart item list (name, qty, options, price, who added tag), edit/remove per item, subtotal, "Place Order" button, table number display (from QR, not editable), session PIN display (for sharing)
- **States**: Empty cart, items in cart, shared cart with multiple contributors

### 7. Order Status
- **Route**: `/c/{slug}/orders`
- **Phase**: 3
- **Components**: Order cards with status badge, per-dish status tracker (placed → confirmed → preparing → ready → served), "Waiting for cafe to confirm" state, "Place another order" button, "Request Bill" button

### 8. Bill & Payment
- **Route**: `/c/{slug}/bill`
- **Phase**: 6
- **Components**: Bill summary (items, quantities, prices, subtotal, tax, service charge, discount, total), "Pay Online" button (Razorpay), "Pay at Counter" option (if enabled), payment confirmation

### 9. Call Waiter Modal
- **Phase**: 3
- **Components**: Type selector cards (Help, Water, Bill, Other), optional message input, "Call" button, confirmation toast

## Staff App — Owner/Manager Dashboard (Desktop-first)

### 10. Staff Login
- **Route**: `/staff/login`
- **Phase**: 1
- **Layout**: Centered card on dark background
- **Components**: Email input, password input, "Login" button (orange), 2FA code input (if enabled)

### 11. Dashboard/Overview
- **Route**: `/staff/dashboard`
- **Phase**: 6
- **Layout**: Dark sidebar + light content area
- **Components**: Stat cards (revenue, orders, avg ticket, products), revenue chart (bar/line), date range filter, recent orders table, most ordered item card, cash vs online split donut chart, onboarding checklist widget (floating bottom-right)

### 12. Live Orders
- **Route**: `/staff/orders`
- **Phase**: 4
- **Components**: Order cards with customer name, table number, items, timestamp, approve/reject buttons, sound notification badge, filter tabs (pending, approved, all), search by table/order number

### 13. Table Grid (Live)
- **Route**: `/staff/tables/live`
- **Phase**: 4
- **Components**: Visual grid of table cards, color-coded (green=free, blue=occupied, yellow=bill-requested, red=waiter-called), session info on hover/tap, quick actions (view session, end session)

### 14. Menu Manager
- **Route**: `/staff/menu`
- **Phase**: 1
- **Components**: Category sidebar, items list with search, bulk select checkboxes, availability toggle per item, veg/non-veg badge, sold-out toggle, drag-to-reorder, "Add Category" / "Add Item" buttons

### 15. Item Editor
- **Route**: `/staff/menu/items/{id}`
- **Phase**: 1
- **Components**: Image upload with preview, name, description, price, category dropdown, veg/non-veg radio, prep time, allergen info, spicy level slider, option groups section (add group, add options with extra price, required/optional toggle), availability toggle

### 16. Tables Manager
- **Route**: `/staff/tables`
- **Phase**: 1
- **Components**: Table list/grid, add table form (number, label, capacity), QR preview per table, download QR button, bulk QR print (PDF sheet), edit/delete table

### 17. Staff Management
- **Route**: `/staff/team`
- **Phase**: 1
- **Components**: Staff list (name, role, status, last login), add staff form (name, email, phone, role dropdown), permission toggles for managers, deactivate button

### 18. Business Day
- **Route**: `/staff/day`
- **Phase**: 6
- **Components**: "Start Day" / "End Day" button, current day info, opening cash input, day report (orders, sales, cash/online, discounts, cancellations), cash reconciliation (expected vs counted, difference)

### 19. Reports
- **Route**: `/staff/reports`
- **Phase**: 6
- **Components**: Date range picker, summary cards, orders table with export, revenue chart, cash vs online chart, most ordered items, busiest hours, export CSV/PDF button

### 20. Settings
- **Route**: `/staff/settings`
- **Phase**: 2
- **Components**: Toggle switches for kitchen_mode, allow_pay_at_end, use_manager_login, GST settings (enable, rate), service charge (enable, rate), currency selector

### 21. Subscription (Owner only)
- **Route**: `/staff/subscription`
- **Phase**: 2
- **Components**: Current plan card (name, features, expires), plan comparison grid, "Upgrade" button (Razorpay), payment history table, invoice download

### 22. Profile
- **Route**: `/staff/profile`
- **Phase**: 1
- **Components**: Cafe name, slug, address, city, phone, logo upload, cover image upload, FSSAI display

## Staff App — Kitchen Screen

### 23. Kitchen Display
- **Route**: `/staff/kitchen`
- **Phase**: 5
- **Layout**: Full-screen, dark, large text, no sidebar
- **Components**: Dish ticket boxes (dish name, qty, customizations, notes, table number badge, session color stripe, waiting timer), "Start Preparing" / "Mark Done" buttons per dish, undo button, sound alert on new, auto-scroll

## Staff App — Waiter Screen

### 24. Waiter Home
- **Route**: `/staff/waiter`
- **Phase**: 5
- **Layout**: Mobile-first
- **Components**: Table list with status indicators, waiter call badges (pulsing), call type and message, quick-switch between tables

### 25. Waiter Table View
- **Route**: `/staff/waiter/table/{id}`
- **Phase**: 5
- **Components**: All dishes for this table with status, "Mark Served" button, "Add Item" button (goes through approval), call details if active

## Super Admin Panel (Desktop)

### 26. Admin Login
- **Route**: `/admin/login`
- **Phase**: 1
- **Components**: Email, password, 2FA code (mandatory)

### 27. Admin Dashboard
- **Route**: `/admin/dashboard`
- **Phase**: 2
- **Components**: Stat cards (total cafes, trial/active/expired, MRR, income this month, signups, churn), orders chart, recent signups, pending verifications count

### 28. Cafes List
- **Route**: `/admin/cafes`
- **Phase**: 2
- **Components**: Search, filters (status, plan, city), data table, quick actions (suspend, impersonate), export

### 29. Cafe Detail
- **Route**: `/admin/cafes/{id}`
- **Phase**: 2
- **Components**: Profile info, documents viewer, tables count, order stats, revenue, subscription info, action buttons (approve, suspend, extend days, change plan)

### 30. Verification Queue
- **Route**: `/admin/verify`
- **Phase**: 1
- **Components**: Pending cafes list, document viewer (image/PDF preview), approve/reject with reason, licence details

### 31. Plans Manager
- **Route**: `/admin/plans`
- **Phase**: 2
- **Components**: Plan cards, add/edit form with feature toggles, pricing, billing period, archive button

### 32. Subscriptions
- **Route**: `/admin/subscriptions`
- **Phase**: 2
- **Components**: Cafe list with plan, status, expiry, actions (edit, extend, change plan, custom price), log of changes

### 33-37. Additional admin pages (Payments, Coupons, Announcements, Support, Audit Log, Settings) — Phase 2/7
- **33. Payments** (`/admin/payments`): Transaction history, gateway status, fee splits, refund management
- **34. Coupons** (`/admin/coupons`): Promo code creator, discount rules (% or flat), expiry and usage limits
- **35. Announcements** (`/admin/announcements`): Broadcast message composer, notification banners, target audience filters
- **36. Support** (`/admin/support`): Ticket inbox, cafe inquiries, status triage, communication thread
- **37. Audit Log** (`/admin/audit`): Admin and system activity log, timestamp, actor, IP address, change diffs
- **38. Platform Settings** (`/admin/settings`): Global platform config, Razorpay keys, SMS/OTP gateways, system maintenance toggles

## Navigation Structure

### Customer: Bottom tab bar
- Menu | Cart (badge) | Orders | More (call waiter, bill)

### Staff: Dark sidebar (desktop) / hamburger (mobile)
- Overview, Orders, Tables, Menu, Kitchen, Day, Reports, Team, Offers, Settings, Subscription (owner), Profile

### Admin: Dark sidebar
- Overview, Cafes, Verify, Plans, Subscriptions, Payments, Coupons, Announcements, Support, Audit, Settings

## Responsive Breakpoints
- Mobile: < 768px (customer primary, waiter)
- Tablet: 768-1024px (kitchen display)
- Desktop: > 1024px (staff dashboard, admin)
