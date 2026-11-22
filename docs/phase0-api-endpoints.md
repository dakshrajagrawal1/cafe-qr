# Phase 0: API Endpoints

This document defines the comprehensive REST API specification for the Cafe QR digital ordering and cafe management multi-tenant platform.

### Rate Limiting Policies
- **Staff Login**: `5/min` per account/IP
- **Customer OTP Generation**: `3/min` per phone number
- **Customer Order Placement**: `10/min` per session/device
- **Table QR Verification**: `20/min` per client device

## Authentication
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| POST | /api/auth/register | None | Register new cafe | Creates cafe + owner user |
| POST | /api/auth/login | None | Staff login (email+password) | Returns access+refresh tokens; Rate limit: 5/min |
| POST | /api/auth/refresh | Refresh token | Refresh access token | Rotates refresh token |
| POST | /api/auth/logout | Any | Invalidate tokens | Revokes current session |
| POST | /api/auth/change-password | Staff | Change own password | Invalidates all active sessions |
| POST | /api/auth/2fa/setup | Owner/Admin | Generate 2FA secret+QR | Returns TOTP secret and QR URL |
| POST | /api/auth/2fa/verify | Owner/Admin | Verify and enable 2FA | Validates initial TOTP code |
| POST | /api/auth/2fa/disable | Owner/Admin | Disable 2FA | Requires current password & TOTP code |

## Customer Auth
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| POST | /api/customer/otp/send | None | Send OTP to phone | Rate limited: 3/min |
| POST | /api/customer/otp/verify | None | Verify OTP, get token | Returns device token |
| GET | /api/customer/profile | Customer | Get saved profile | Returns customer name & order history link |
| PUT | /api/customer/profile | Customer | Update name | Updates customer profile name |

## Cafe Profile & Verification Documents
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/profile | Cafe Staff | Get cafe profile | Returns cafe details, status, branding URLs |
| PUT | /api/cafe/profile | Owner/Admin | Update cafe profile & branding | Updates profile info; accepts multipart logo/cover upload |
| GET | /api/cafe/documents | Owner/Admin | List verification documents | Returns document types, approval status, and presigned download URLs |
| POST | /api/cafe/documents | Owner/Admin | Upload verification document | Multipart upload for FSSAI, GST, PAN |

## Menu Categories
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/categories | Cafe Staff | List menu categories | Ordered list of active/inactive categories |
| POST | /api/cafe/categories | Owner/Manager | Create menu category | Name, description, active status |
| PUT | /api/cafe/categories/:id | Owner/Manager | Update menu category | Edit category name and settings |
| DELETE | /api/cafe/categories/:id | Owner/Manager | Delete menu category | Soft delete / archive category |
| PATCH | /api/cafe/categories/reorder | Owner/Manager | Reorder categories | Bulk update sort order array |

## Menu Items
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/items | Cafe Staff | List menu items | Filter by category, dietary tag, availability |
| POST | /api/cafe/items | Owner/Manager | Create menu item | Price, veg/non-veg tag, options, image upload |
| PUT | /api/cafe/items/:id | Owner/Manager | Update menu item | Edit item fields, options, or replace image |
| DELETE | /api/cafe/items/:id | Owner/Manager | Delete menu item | Soft delete / archive menu item |
| PATCH | /api/cafe/items/bulk-availability | Cafe Staff | Bulk toggle item availability | Quick toggle in-stock/out-of-stock |
| PATCH | /api/cafe/items/reorder | Owner/Manager | Reorder menu items | Bulk update sort order within category |

## Option Groups & Options
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/option-groups | Cafe Staff | List option groups and options | Variants, add-ons, portion sizes |
| POST | /api/cafe/option-groups | Owner/Manager | Create option group with options | Defines min/max selections and option choices |
| PUT | /api/cafe/option-groups/:id | Owner/Manager | Update option group & options | Modify group rules and nested choices |
| DELETE | /api/cafe/option-groups/:id | Owner/Manager | Delete option group | Deletes group and linked option values |

## Tables & QR Codes
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/tables | Cafe Staff | List tables | Table numbers, capacity, section, QR status |
| POST | /api/cafe/tables | Owner/Manager | Create table | Add table with section and seating capacity |
| PUT | /api/cafe/tables/:id | Owner/Manager | Update table | Update table number, section, or active flag |
| DELETE | /api/cafe/tables/:id | Owner/Manager | Delete table | Soft delete table |
| POST | /api/cafe/tables/:id/qr | Owner/Manager | Generate signed table QR token | Issues HMAC-signed token and QR asset |
| GET | /api/cafe/tables/qr/pdf | Owner/Manager | Bulk export QR PDF | Generates printable sheet of all table QR cards |

## Staff Management
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/staff | Owner/Admin | List staff members | Staff names, emails, roles, permissions |
| POST | /api/cafe/staff | Owner/Admin | Create staff member | Invites staff member with initial role |
| PUT | /api/cafe/staff/:id | Owner/Admin | Update staff & permissions | Assign granular permissions and role |
| DELETE | /api/cafe/staff/:id | Owner/Admin | Remove staff member | Revokes staff credentials and access |

## Cafe Settings
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/settings | Owner/Manager | Get cafe settings | Operating hours, taxes, service charges, currency |
| PUT | /api/cafe/settings | Owner/Admin | Update cafe settings | Updates operational and billing parameters |

## Business Day Operations
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/business-day | Cafe Staff | Get business day status & history | Current open/closed status; ?history=true for logs |
| POST | /api/cafe/business-day/start | Owner/Manager | Start business day | Opens register and initializes daily counters |
| POST | /api/cafe/business-day/end | Owner/Manager | End business day | Closes register and generates daily reconciliation summary |

## Orders Management
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/orders | Cafe Staff | List orders | Filter by status, table, date range, pagination |
| GET | /api/cafe/orders/:id | Cafe Staff | Get order detail | Full breakdown of items, customizations, and timestamps |
| PATCH | /api/cafe/orders/:id/status | Cafe Staff | Approve, reject, or cancel order | Transitions status; requires reason for reject/cancel |
| POST | /api/cafe/orders/session/:sessionId/items | Cafe Staff | Add item to active session | Manual POS order entry by staff |

## Kitchen Display System (KDS)
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/kitchen/dishes | Kitchen/Staff | Get active dishes for KDS | List pending and in-prep dish tickets |
| PATCH | /api/cafe/kitchen/dishes/:id/status | Kitchen/Staff | Update dish status or undo | Transitions: preparing, ready, served; supports undo |

## Waiter Operations
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/waiter/calls | Waiter/Staff | List waiter calls | Active customer assistance requests |
| PATCH | /api/cafe/waiter/calls/:id | Waiter/Staff | Acknowledge or resolve call | Updates call state: acknowledged / resolved |
| GET | /api/cafe/waiter/tables-overview | Waiter/Staff | Tables overview status | Seated, dining, billing, and vacant table matrix |
| PATCH | /api/cafe/waiter/orders/:id/served | Waiter/Staff | Mark order items served | Quick action marking completed dishes as served |

## Billing & Settlement
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| POST | /api/cafe/bills | Cashier/Staff | Create bill for session | Generates draft bill with taxes, service charges, discounts |
| GET | /api/cafe/bills/:id | Cafe Staff | Get bill detail | Itemized billing summary, breakdown, payments, split info |
| POST | /api/cafe/bills/:id/settle | Cashier/Staff | Settle bill payment | Records Cash, Card, UPI, or manual split settlement |
| POST | /api/cafe/bills/:id/void | Owner/Manager | Void bill | Requires manager authorization code and reason |
| POST | /api/cafe/bills/:id/split | Cashier/Staff | Split bill | Splits bill equally or by item selections |

## Reports & Analytics
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/reports/daily | Owner/Manager | Daily sales & ops report | Revenue, order counts, payment mix, top sellers |
| GET | /api/cafe/reports/range | Owner/Manager | Date-range sales report | Aggregated metrics; supports ?format=csv or ?format=pdf export |

## Offers & Discounts
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/offers | Cafe Staff | List cafe offers | Active and scheduled discount codes / deals |
| POST | /api/cafe/offers | Owner/Manager | Create promotional offer | Discount type (percentage/flat), min spend, validity |
| PUT | /api/cafe/offers/:id | Owner/Manager | Update or toggle offer | Modify discount terms or activate/deactivate/archive |

## Subscription & Billing
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/cafe/subscription | Owner | Get current subscription | Plan tier, renewal date, quota usage, status |
| GET | /api/cafe/subscription/plans | Owner | List subscription plans | Available tiers and pricing schedules |
| POST | /api/cafe/subscription/initiate | Owner | Initiate Razorpay checkout | Creates Razorpay order for plan upgrade/renewal |
| GET | /api/cafe/subscription/payments | Owner | Get payment history | Past invoices, transaction receipts, payment statuses |

## Customer Endpoints
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/c/:slug/menu | None | Get public cafe menu | Checks cafe is approved & active; public cached |
| POST | /api/c/table/verify | None | Verify table QR token | Validates HMAC signature on scanned table QR; Rate limited: 20/min |
| POST | /api/c/sessions | Customer/Device | Join or create table session | Binds customer device to active table session |
| GET | /api/c/sessions/:id | Customer/Device | Get active session details | Active diners, table number, order summary |
| POST | /api/c/sessions/:id/leave | Customer/Device | Leave table session | Removes user device from session |
| GET | /api/c/cart | Customer/Device | Get shared table cart | Real-time cart items shared across table session |
| POST | /api/c/cart/items | Customer/Device | Add item to cart | Adds item with selected options and notes |
| PUT | /api/c/cart/items/:itemId | Customer/Device | Update or remove cart item | Updates item quantity; setting quantity to 0 removes item |
| POST | /api/c/orders | Customer/Device | Place order from cart | Submits cart items as new order; Rate limited: 10/min |
| GET | /api/c/orders | Customer/Device | List customer orders | All orders placed in current table session |
| GET | /api/c/orders/:id | Customer/Device | Get order status | Real-time preparation state of specific order |
| POST | /api/c/bill/request | Customer/Device | Request bill for table | Alerts waiter/cashier that table is requesting checkout |
| GET | /api/c/bill | Customer/Device | Get current table bill | Itemized bill preview with taxes, payment status, split options |
| POST | /api/c/bill/pay | Customer/Device | Pay bill online | Creates Razorpay order for online customer payment |
| POST | /api/c/waiter/call | Customer/Device | Call waiter | Send call assistance: Water, Bill, Cutlery, Help |
| GET | /api/c/waiter/calls | Customer/Device | List active waiter calls | Check acknowledgement status of customer calls |
| POST | /api/c/ratings | Customer/Device | Submit dining feedback & rating | Food and service ratings submitted post-settlement |

## Super Admin Endpoints
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/admin/overview | Super Admin | Platform overview stats | MRR, active cafes, live orders, active sessions |
| GET | /api/admin/cafes | Super Admin | List cafes | Filter by status, plan, city; Supports ?format=csv export |
| GET | /api/admin/cafes/:id | Super Admin | Get cafe full details | Profile, owners, verification, metrics, subscription |
| PATCH | /api/admin/cafes/:id/status | Super Admin | Suspend or reactivate cafe | Toggles cafe active/suspended state with audit note |
| POST | /api/admin/cafes/:id/impersonate | Super Admin | Impersonate cafe owner | Issues short-lived scoped JWT for administrative support |
| DELETE | /api/admin/cafes/:id | Super Admin | Delete cafe | Soft delete / purge cafe data and revoke credentials |
| GET | /api/admin/verification/queue | Super Admin | List verification queue | Pending cafe submissions awaiting approval |
| GET | /api/admin/verification/:id/documents | Super Admin | Get cafe verification documents | Inspect uploaded FSSAI, GST, PAN documents |
| PATCH | /api/admin/verification/:id | Super Admin | Approve or reject cafe verification | Sets verified/rejected status with reviewer notes |
| GET | /api/admin/plans | Super Admin | List all plans | All subscription plan tiers including archived |
| POST | /api/admin/plans | Super Admin | Create subscription plan | Tier pricing, table/staff limits, feature flags |
| PUT | /api/admin/plans/:id | Super Admin | Update plan or archive | Modifies plan parameters or sets is_active: false |
| GET | /api/admin/subscriptions | Super Admin | List all subscriptions | Filter by tier, renewal date, payment status |
| PUT | /api/admin/subscriptions/:id | Super Admin | Modify subscription | Edit validity, extend trial, change plan, or set custom price |
| GET | /api/admin/payments | Super Admin | List all platform payments | Online Razorpay and offline transactions |
| POST | /api/admin/payments/offline | Super Admin | Record offline payment | Logs manual bank transfer/cash subscription payment |
| POST | /api/admin/payments/:id/invoice | Super Admin | Generate tax invoice | Creates downloadable GST tax invoice PDF |
| GET | /api/admin/coupons | Super Admin | List platform coupons | Active and expired promotional coupons |
| POST | /api/admin/coupons | Super Admin | Create platform coupon | Discount %, max usage, expiry timestamp |
| DELETE | /api/admin/coupons/:id | Super Admin | Delete or revoke coupon | Deactivates coupon code |
| GET | /api/admin/announcements | Super Admin | List announcements | System notices and maintenance banners |
| POST | /api/admin/announcements | Super Admin | Create announcement | Broadcasts notice to targeted cafe tiers |
| DELETE | /api/admin/announcements/:id | Super Admin | Delete announcement | Removes announcement notice |
| GET | /api/admin/tickets | Super Admin | List support tickets | Filter by open, pending, resolved, priority |
| PATCH | /api/admin/tickets/:id | Super Admin | Update support ticket | Assign agent, update status, append admin reply |
| GET | /api/admin/audit-logs | Super Admin | List audit logs | Filterable by actor, cafe, action, IP, date range |
| GET | /api/admin/settings | Super Admin | Get platform settings | Payment gateway keys, maintenance mode, global params |
| PUT | /api/admin/settings | Super Admin | Update platform settings | Update system-wide configuration keys |

## Realtime
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| GET | /api/realtime/poll | Any authenticated | Poll for new events | channels, since params; long-polling fallback |

## Internal (cron-triggered)
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| POST | /api/internal/cron/check-expiry | Internal key | Check subscription expiry | Daily job: marks expired subscriptions, applies grace period |
| POST | /api/internal/cron/send-reminders | Internal key | Send expiry/license reminders | Triggers automated renewal and compliance reminder notices |
| POST | /api/internal/cron/cleanup-events | Internal key | Prune old realtime events | Purges event log records older than retention window |

## Webhooks
| Method | Path | Auth | Description | Notes |
|--------|------|------|-------------|-------|
| POST | /api/webhooks/razorpay | Razorpay signature | Payment webhook | Idempotent; processes payment.captured & subscription events |
