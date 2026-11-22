# Phase 0: Database Schema

## Design Principles

The database architecture for the Cafe QR Ordering and Management System is engineered around seven core principles to guarantee high performance, strict multi-tenant isolation, data consistency, and seamless operation within a shared MySQL 8 hosting environment.

1. **Strict Multi-Tenant Scoping (`cafe_id`)**:
   - Every tenant-level table includes a foreign key `cafe_id` referencing the `cafes` table.
   - Platform-wide tables (`plans`, `plan_features`, `platform_settings`, `coupons`, `announcements`, `otp_requests`) are global and not tenant-scoped.
   - Multi-tenant queries must always filter by `cafe_id` to enforce data isolation at the ORM/query level, backed by composite database indexes starting with `cafe_id`.

2. **Integer Monetary Precision (Paise)**:
   - Floating-point representations (`FLOAT`, `DOUBLE`, `DECIMAL` without careful handling) are strictly prohibited for financial calculations to prevent precision loss and IEEE 754 rounding errors.
   - All monetary values are represented as unsigned or signed 32-bit or 64-bit integers denominated in Indian **Paise** (1 INR = 100 Paise).
   - Column names representing currency amounts must carry the suffix `_paise` (e.g., `base_price_paise`, `subtotal_paise`, `tax_paise`, `total_paise`, `refund_amount_paise`).

3. **Identifier Standards (ULID & CUID)**:
   - Primary keys in Prisma use `@id @default(cuid())` or application-generated ULIDs (Universally Unique Lexicographically Sortable Identifiers, 26 characters).
   - ULIDs provide timestamp-ordered sortability, URL friendliness, cryptographic unpredictability against enumeration attacks, and eliminate reliance on distributed ID coordination.
   - Short sequential codes (`order_number`, `bill_number`, `session_code`) are maintained separately for human readability by kitchen staff and guests.

4. **Uniform Timestamp Auditing**:
   - Every database table includes `created_at` (`DateTime @default(now())`) and `updated_at` (`DateTime @updatedAt`).
   - Timestamps reflect UTC in the storage engine, while tenant display formatting is localized using `cafe_settings.timezone` (default `Asia/Kolkata`).

5. **Soft Deletes on Historical Entities**:
   - Entities whose deletion would invalidate historical orders, accounting audits, tax invoices, or analytical reports use soft deletion via `deleted_at DateTime?`.
   - Applied to `Cafe`, `CafeDocument`, `Plan`, `Coupon`, `User`, `Table`, `Category`, `Item`, `OptionGroup`, `Option`, `Order`, and `Offer`.
   - Deleted entities are preserved for auditing while excluded from active application queries using Prisma middleware or explicit `where: { deletedAt: null }`.

6. **Strict Prisma Enums for Status Fields**:
   - All state transitions, role scopes, document validations, and payment lifecycles are modeled via explicit Prisma enums rather than loose strings.
   - Enums are compiled directly to MySQL native `ENUM` types for optimal storage footprint (1–2 bytes per row) and database-level constraint enforcement.

7. **JSON Used Sparingly**:
   - JSON data columns (`Json?`) are restricted strictly to unstructured metadata, fine-grained user permission maps, ordered snapshot states (such as selected options on historical order items), or payment gateway response payloads.
   - Core relational data, status flags, and search predicates are always normalized into first-class columns.

8. **Optimized Composite Indexes**:
   - Composite indexes are prefixed with `cafe_id` (e.g., `[cafeId, status, createdAt]`) to allow the MySQL query planner to perform rapid index range scans without full table scans.

---

## Full Prisma Schema

The complete, production-ready `schema.prisma` definition for the Cafe QR system is provided below:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ==================== ENUMS ====================

enum CafeStatus {
  pending_verification
  approved
  rejected
  suspended
}

enum DocumentType {
  business_registration
  fssai
  gstin
  owner_id_proof
  cafe_photo
}

enum DocumentStatus {
  pending
  approved
  rejected
}

enum UserRole {
  super_admin
  owner
  manager
  chef
  waiter
}

enum BillingPeriod {
  monthly
  quarterly
  yearly
  custom
}

enum SubscriptionStatus {
  trial
  active
  expiring
  grace
  expired
  suspended
}

enum PaymentMode {
  online
  cash
  upi
  bank
}

enum SubscriptionPaymentStatus {
  pending
  completed
  failed
}

enum SessionStatus {
  open
  bill_requested
  closed
}

enum BusinessDayStatus {
  open
  closed
}

enum OrderStatus {
  pending_approval
  approved
  rejected
  cancelled
}

enum DishStatus {
  placed
  confirmed
  preparing
  ready
  served
  cancelled
}

enum BillStatus {
  draft
  issued
  paid
  void
}

enum CustomerPaymentMode {
  cash
  online
  upi_counter
  split
}

enum CustomerPaymentStatus {
  pending
  completed
  failed
  refunded
}

enum RefundStatus {
  pending_approval
  approved
  processed
  rejected
}

enum WaiterCallType {
  help
  water
  bill
  other
}

enum WaiterCallStatus {
  active
  acknowledged
  resolved
}

enum DiscountType {
  percentage
  fixed
  days
}

enum AnnouncementTarget {
  all
  specific
}

enum TicketStatus {
  open
  in_progress
  resolved
  closed
}

enum TicketPriority {
  low
  medium
  high
  urgent
}

enum OtpPurpose {
  login
  verify_phone
}

// ==================== PLATFORM TABLES ====================

model Plan {
  id            String        @id @default(cuid())
  name          String        @db.VarChar(128)
  description   String?       @db.Text
  pricePaise    Int           @map("price_paise")
  billingPeriod BillingPeriod @map("billing_period")
  billingDays   Int?          @map("billing_days")
  trialDays     Int           @default(14) @map("trial_days")
  isActive      Boolean       @default(true) @map("is_active")
  isArchived    Boolean       @default(false) @map("is_archived")
  sortOrder     Int           @default(0) @map("sort_order")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")
  deletedAt     DateTime?     @map("deleted_at")

  features      PlanFeature[]
  subscriptions Subscription[]

  @@map("plans")
}

model PlanFeature {
  id           String @id @default(cuid())
  planId       String @map("plan_id")
  featureKey   String @map("feature_key") @db.VarChar(128)
  featureValue String @map("feature_value") @db.VarChar(255)

  plan Plan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@unique([planId, featureKey])
  @@map("plan_features")
}

model PlatformSettings {
  id                     String   @id @default("default")
  razorpayKeyId          String?  @map("razorpay_key_id") @db.VarChar(255)
  razorpayKeySecret      String?  @map("razorpay_key_secret") @db.VarChar(255)
  razorpayWebhookSecret  String?  @map("razorpay_webhook_secret") @db.VarChar(255)
  defaultTrialDays       Int      @default(14) @map("default_trial_days")
  defaultGraceDays       Int      @default(3) @map("default_grace_days")
  platformGstPercentage  Float    @default(18.0) @map("platform_gst_percentage")
  supportEmail           String   @default("support@cafeqr.app") @map("support_email") @db.VarChar(191)
  supportPhone           String?  @map("support_phone") @db.VarChar(32)
  maintenanceMode        Boolean  @default(false) @map("maintenance_mode")
  announcementBanner     String?  @map("announcement_banner") @db.Text
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  @@map("platform_settings")
}

model Coupon {
  id                    String       @id @default(cuid())
  code                  String       @unique @db.VarChar(64)
  description           String?      @db.VarChar(255)
  discountType          DiscountType @map("discount_type")
  discountValue         Int          @map("discount_value") // Percentage (e.g., 20) or fixed Paise (e.g., 50000 = Rs 500) or extra days
  minPlanDurationMonths Int          @default(1) @map("min_plan_duration_months")
  maxDiscountPaise      Int?         @map("max_discount_paise")
  validFrom             DateTime     @map("valid_from")
  validUntil            DateTime     @map("valid_until")
  maxRedemptions        Int?         @map("max_redemptions")
  currentRedemptions    Int          @default(0) @map("current_redemptions")
  isActive              Boolean      @default(true) @map("is_active")
  createdAt             DateTime     @default(now()) @map("created_at")
  updatedAt             DateTime     @updatedAt @map("updated_at")
  deletedAt             DateTime?    @map("deleted_at")

  subscriptions         Subscription[]

  @@map("coupons")
  @@index([code, isActive])
  @@index([validFrom, validUntil])
}

model Announcement {
  id             String             @id @default(cuid())
  title          String             @db.VarChar(255)
  content        String             @db.Text
  targetType     AnnouncementTarget @default(all) @map("target_type")
  targetCafeIds  Json?              @map("target_cafe_ids") // Nullable JSON array of cafe ULIDs when targetType = specific
  priority       TicketPriority     @default(medium)
  startsAt       DateTime           @map("starts_at")
  endsAt         DateTime           @map("ends_at")
  isActive       Boolean            @default(true) @map("is_active")
  createdAt      DateTime           @default(now()) @map("created_at")
  updatedAt      DateTime           @updatedAt @map("updated_at")

  @@map("announcements")
  @@index([isActive, startsAt, endsAt])
}

model SupportTicket {
  id           String         @id @default(cuid())
  cafeId       String?        @map("cafe_id")
  userId       String?        @map("user_id")
  ticketNumber String         @unique @map("ticket_number") @db.VarChar(64)
  subject      String         @db.VarChar(255)
  description  String         @db.Text
  priority     TicketPriority @default(medium)
  status       TicketStatus   @default(open)
  resolvedAt   DateTime?      @map("resolved_at")
  closedAt     DateTime?      @map("closed_at")
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  cafe         Cafe?          @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  user         User?          @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("support_tickets")
  @@index([cafeId, status])
  @@index([userId, status])
  @@index([status, priority])
}

// ==================== TENANT CORE TABLES ====================

model Cafe {
  id              String     @id @default(cuid())
  slug            String     @unique @db.VarChar(128)
  name            String     @db.VarChar(191)
  brandName       String?    @map("brand_name") @db.VarChar(191)
  description     String?    @db.Text
  logoUrl         String?    @map("logo_url") @db.VarChar(512)
  coverUrl        String?    @map("cover_url") @db.VarChar(512)
  email           String     @db.VarChar(191)
  phone           String     @db.VarChar(32)
  addressLine1    String     @map("address_line1") @db.VarChar(255)
  addressLine2    String?    @map("address_line2") @db.VarChar(255)
  city            String     @db.VarChar(128)
  state           String     @db.VarChar(128)
  postalCode      String     @map("postal_code") @db.VarChar(32)
  country         String     @default("IN") @db.VarChar(8)
  latitude        Float?
  longitude       Float?
  gstin           String?    @db.VarChar(32)
  fssaiNumber     String?    @map("fssai_number") @db.VarChar(64)
  status          CafeStatus @default(pending_verification)
  rejectionReason String?    @map("rejection_reason") @db.Text
  isVerified      Boolean    @default(false) @map("is_verified")
  verifiedAt      DateTime?  @map("verified_at")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")
  deletedAt       DateTime?  @map("deleted_at")

  settings             CafeSettings?
  documents            CafeDocument[]
  subscriptions        Subscription[]
  subscriptionPayments SubscriptionPayment[]
  users                User[]
  tables               Table[]
  businessDays         BusinessDay[]
  sessions             TableSession[]
  customers            Customer[]
  categories           Category[]
  items                Item[]
  optionGroups         OptionGroup[]
  carts                Cart[]
  orders               Order[]
  orderItems           OrderItem[]
  bills                Bill[]
  payments             Payment[]
  refunds              Refund[]
  offers               Offer[]
  waiterCalls          WaiterCall[]
  supportTickets       SupportTicket[]
  auditLogs            AuditLog[]
  realtimeEvents       RealtimeEvent[]

  @@map("cafes")
  @@index([status])
  @@index([phone])
  @@index([city])
  @@index([createdAt])
}

model CafeSettings {
  id                         String   @id @default(cuid())
  cafeId                     String   @unique @map("cafe_id")
  currency                   String   @default("INR") @db.VarChar(8)
  timezone                   String   @default("Asia/Kolkata") @db.VarChar(64)
  taxGstPercentage           Float    @default(5.0) @map("tax_gst_percentage")
  cgstPercentage             Float    @default(2.5) @map("cgst_percentage")
  sgstPercentage             Float    @default(2.5) @map("sgst_percentage")
  isGstInclusive             Boolean  @default(false) @map("is_gst_inclusive")
  serviceChargePercentage    Float    @default(0.0) @map("service_charge_percentage")
  enableServiceCharge        Boolean  @default(false) @map("enable_service_charge")
  enableOnlinePayment        Boolean  @default(true) @map("enable_online_payment")
  enableCashPayment          Boolean  @default(true) @map("enable_cash_payment")
  enableUpiPayment           Boolean  @default(true) @map("enable_upi_payment")
  enablePayAtCounter         Boolean  @default(true) @map("enable_pay_at_counter")
  upiId                      String?  @map("upi_id") @db.VarChar(128)
  upiQrImageUrl              String?  @map("upi_qr_image_url") @db.VarChar(512)
  razorpayKeyId              String?  @map("razorpay_key_id") @db.VarChar(255)
  razorpayKeySecret          String?  @map("razorpay_key_secret") @db.VarChar(255)
  autoApproveOrders          Boolean  @default(false) @map("auto_approve_orders")
  requirePhoneForOrder       Boolean  @default(false) @map("require_phone_for_order")
  allowCustomerCancelMinutes Int      @default(2) @map("allow_customer_cancel_minutes")
  openingTime                String   @default("09:00") @map("opening_time") @db.VarChar(16)
  closingTime                String   @default("23:00") @map("closing_time") @db.VarChar(16)
  pollingIntervalSeconds     Int      @default(3) @map("polling_interval_seconds")
  wifiSsid                   String?  @map("wifi_ssid") @db.VarChar(128)
  wifiPassword               String?  @map("wifi_password") @db.VarChar(128)
  customThemeJson            Json?    @map("custom_theme_json")
  createdAt                  DateTime @default(now()) @map("created_at")
  updatedAt                  DateTime @updatedAt @map("updated_at")

  cafe Cafe @relation(fields: [cafeId], references: [id], onDelete: Cascade)

  @@map("cafe_settings")
}

model CafeDocument {
  id              String         @id @default(cuid())
  cafeId          String         @map("cafe_id")
  documentType    DocumentType   @map("document_type")
  documentUrl     String         @map("document_url") @db.VarChar(512)
  documentNumber  String?        @map("document_number") @db.VarChar(128)
  status          DocumentStatus @default(pending)
  rejectionReason String?        @map("rejection_reason") @db.Text
  verifiedAt      DateTime?      @map("verified_at")
  verifiedBy      String?        @map("verified_by") @db.VarChar(191)
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")
  deletedAt       DateTime?      @map("deleted_at")

  cafe Cafe @relation(fields: [cafeId], references: [id], onDelete: Cascade)

  @@map("cafe_documents")
  @@index([cafeId, documentType])
  @@index([status])
}

// ==================== SUBSCRIPTIONS & BILLING ====================

model Subscription {
  id                 String             @id @default(cuid())
  cafeId             String             @map("cafe_id")
  planId             String             @map("plan_id")
  couponId           String?            @map("coupon_id")
  status             SubscriptionStatus @default(trial)
  startDate          DateTime           @map("start_date")
  endDate            DateTime           @map("end_date")
  trialEndsAt        DateTime?          @map("trial_ends_at")
  graceEndsAt        DateTime?          @map("grace_ends_at")
  autoRenew          Boolean            @default(true) @map("auto_renew")
  lastBillingAt      DateTime?          @map("last_billing_at")
  nextBillingAt      DateTime?          @map("next_billing_at")
  cancelledAt        DateTime?          @map("cancelled_at")
  cancellationReason String?            @map("cancellation_reason") @db.Text
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  cafe     Cafe                  @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  plan     Plan                  @relation(fields: [planId], references: [id], onDelete: Restrict)
  coupon   Coupon?               @relation(fields: [couponId], references: [id], onDelete: SetNull)
  payments SubscriptionPayment[]

  @@map("subscriptions")
  @@index([cafeId, status])
  @@index([status, endDate])
}

model SubscriptionPayment {
  id               String                    @id @default(cuid())
  subscriptionId   String                    @map("subscription_id")
  cafeId           String                    @map("cafe_id")
  amountPaise      Int                       @map("amount_paise")
  taxPaise         Int                       @default(0) @map("tax_paise")
  paymentMode      PaymentMode               @map("payment_mode")
  status           SubscriptionPaymentStatus @default(pending)
  gatewayOrderId   String?                   @map("gateway_order_id") @db.VarChar(191)
  gatewayPaymentId String?                   @map("gateway_payment_id") @db.VarChar(191)
  gatewaySignature String?                   @map("gateway_signature") @db.VarChar(255)
  invoiceNumber    String?                   @map("invoice_number") @db.VarChar(64)
  invoiceUrl       String?                   @map("invoice_url") @db.VarChar(512)
  paidAt           DateTime?                 @map("paid_at")
  failureReason    String?                   @map("failure_reason") @db.Text
  metadata         Json?
  createdAt        DateTime                  @default(now()) @map("created_at")
  updatedAt        DateTime                  @updatedAt @map("updated_at")

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  cafe         Cafe         @relation(fields: [cafeId], references: [id], onDelete: Cascade)

  @@map("subscription_payments")
  @@index([cafeId, status])
  @@index([subscriptionId])
  @@index([gatewayPaymentId])
}

// ==================== USERS, AUTH & SECURITY ====================

model User {
  id                     String    @id @default(cuid())
  cafeId                 String?   @map("cafe_id") // Nullable for super_admin
  role                   UserRole
  name                   String    @db.VarChar(191)
  email                  String?   @unique @db.VarChar(191)
  phone                  String    @db.VarChar(32)
  passwordHash           String?   @map("password_hash") @db.VarChar(255)
  pinHash                String?   @map("pin_hash") @db.VarChar(255) // Argon2 hash for 4-6 digit quick login PIN
  permissions            Json?     // Fine-grained permission overrides: ["can_edit_menu", "can_issue_refunds", ...]
  isActive               Boolean   @default(true) @map("is_active")
  isEmailVerified        Boolean   @default(false) @map("is_email_verified")
  isPhoneVerified        Boolean   @default(false) @map("is_phone_verified")
  twoFactorEnabled       Boolean   @default(false) @map("two_factor_enabled")
  twoFactorSecret        String?   @map("two_factor_secret") @db.VarChar(255) // TOTP secret key
  twoFactorRecoveryCodes Json?     @map("two_factor_recovery_codes")
  failedLoginAttempts    Int       @default(0) @map("failed_login_attempts")
  lockoutUntil           DateTime? @map("lockout_until")
  lastLoginAt            DateTime? @map("last_login_at")
  lastLoginIp            String?   @map("last_login_ip") @db.VarChar(64)
  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")
  deletedAt              DateTime? @map("deleted_at")

  cafe           Cafe?           @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  auditLogs      AuditLog[]
  supportTickets SupportTicket[]

  @@unique([cafeId, phone])
  @@map("users")
  @@index([cafeId, role, isActive])
  @@index([phone])
}

model OtpRequest {
  id          String     @id @default(cuid())
  phone       String     @db.VarChar(32)
  otpHash     String     @map("otp_hash") @db.VarChar(255)
  purpose     OtpPurpose
  attempts    Int        @default(0)
  maxAttempts Int        @default(3) @map("max_attempts")
  expiresAt   DateTime   @map("expires_at")
  isConsumed  Boolean    @default(false) @map("is_consumed")
  ipAddress   String?    @map("ip_address") @db.VarChar(64)
  userAgent   String?    @map("user_agent") @db.VarChar(255)
  createdAt   DateTime   @default(now()) @map("created_at")

  @@map("otp_requests")
  @@index([phone, purpose, isConsumed])
  @@index([expiresAt])
}

// ==================== TABLES, BUSINESS DAYS & SESSIONS ====================

model Table {
  id              String    @id @default(cuid())
  cafeId          String    @map("cafe_id")
  tableNumber     String    @map("table_number") @db.VarChar(64)
  section         String?   @db.VarChar(64) // e.g., "Ground Floor", "Rooftop", "AC Hall"
  seatingCapacity Int       @default(4) @map("seating_capacity")
  qrSecret        String    @map("qr_secret") @db.VarChar(128) // High-entropy salt for HMAC token generation
  qrCodeUrl       String?   @map("qr_code_url") @db.VarChar(512)
  isActive        Boolean   @default(true) @map("is_active")
  sortOrder       Int       @default(0) @map("sort_order")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  cafe        Cafe           @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  sessions    TableSession[]
  waiterCalls WaiterCall[]

  @@unique([cafeId, tableNumber])
  @@map("tables")
  @@index([cafeId, isActive, sortOrder])
}

model BusinessDay {
  id                       String            @id @default(cuid())
  cafeId                   String            @map("cafe_id")
  dayNumber                Int               @map("day_number") // Sequential counter within the cafe
  businessDate             DateTime          @map("business_date") @db.Date
  status                   BusinessDayStatus @default(open)
  openedAt                 DateTime          @default(now()) @map("opened_at")
  closedAt                 DateTime?         @map("closed_at")
  openedByUserId           String?           @map("opened_by_user_id") @db.VarChar(191)
  closedByUserId           String?           @map("closed_by_user_id") @db.VarChar(191)
  openingCashPaise         Int               @default(0) @map("opening_cash_paise")
  closingCashActualPaise   Int?              @map("closing_cash_actual_paise")
  closingCashExpectedPaise Int?              @map("closing_cash_expected_paise")
  totalSalesPaise          Int               @default(0) @map("total_sales_paise")
  totalOrdersCount         Int               @default(0) @map("total_orders_count")
  notes                    String?           @db.Text
  createdAt                DateTime          @default(now()) @map("created_at")
  updatedAt                DateTime          @updatedAt @map("updated_at")

  cafe     Cafe           @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  sessions TableSession[]
  orders   Order[]
  bills    Bill[]

  @@unique([cafeId, businessDate])
  @@map("business_days")
  @@index([cafeId, status])
}

model Customer {
  id              String   @id @default(cuid())
  cafeId          String   @map("cafe_id")
  phone           String   @db.VarChar(32)
  name            String?  @db.VarChar(191)
  email           String?  @db.VarChar(191)
  totalVisits     Int      @default(1) @map("total_visits")
  totalSpentPaise Int      @default(0) @map("total_spent_paise")
  lastVisitedAt   DateTime @default(now()) @map("last_visited_at")
  isBlocked       Boolean  @default(false) @map("is_blocked")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  cafe           Cafe            @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  sessionMembers SessionMember[]
  carts          Cart[]
  orders         Order[]
  bills          Bill[]

  @@unique([cafeId, phone])
  @@map("customers")
  @@index([cafeId, lastVisitedAt])
}

model TableSession {
  id               String        @id @default(cuid())
  cafeId           String        @map("cafe_id")
  tableId          String        @map("table_id")
  businessDayId    String?       @map("business_day_id")
  sessionCode      String        @map("session_code") @db.VarChar(16) // Short 4-6 alphanumeric code for table sharing
  status           SessionStatus @default(open)
  openedAt         DateTime      @default(now()) @map("opened_at")
  billRequestedAt  DateTime?     @map("bill_requested_at")
  closedAt         DateTime?     @map("closed_at")
  closedByUserId   String?       @map("closed_by_user_id") @db.VarChar(191)
  guestCount       Int           @default(1) @map("guest_count")
  notes            String?       @db.Text
  createdAt        DateTime      @default(now()) @map("created_at")
  updatedAt        DateTime      @updatedAt @map("updated_at")

  cafe        Cafe            @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  table       Table           @relation(fields: [tableId], references: [id], onDelete: Restrict)
  businessDay BusinessDay?    @relation(fields: [businessDayId], references: [id], onDelete: SetNull)
  members     SessionMember[]
  carts       Cart[]
  orders      Order[]
  bills       Bill[]
  waiterCalls WaiterCall[]

  @@map("table_sessions")
  @@index([cafeId, tableId, status])
  @@index([cafeId, status, openedAt])
}

model SessionMember {
  id                String   @id @default(cuid())
  sessionId         String   @map("session_id")
  customerId        String?  @map("customer_id")
  deviceFingerprint String   @map("device_fingerprint") @db.VarChar(128)
  nickname          String   @db.VarChar(64) // e.g. "Guest 1", "Daksh"
  isHost            Boolean  @default(false) @map("is_host")
  lastActiveAt      DateTime @default(now()) @map("last_active_at")
  joinedAt          DateTime @default(now()) @map("joined_at")

  session  TableSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  customer Customer?    @relation(fields: [customerId], references: [id], onDelete: SetNull)
  cart     Cart?

  @@unique([sessionId, deviceFingerprint])
  @@map("session_members")
  @@index([sessionId])
  @@index([customerId])
}

// ==================== MENU CATALOG ====================

model Category {
  id               String    @id @default(cuid())
  cafeId           String    @map("cafe_id")
  name             String    @db.VarChar(128)
  description      String?   @db.Text
  imageUrl         String?   @map("image_url") @db.VarChar(512)
  sortOrder        Int       @default(0) @map("sort_order")
  isActive         Boolean   @default(true) @map("is_active")
  parentCategoryId String?   @map("parent_category_id")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  deletedAt        DateTime? @map("deleted_at")

  cafe          Cafe       @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  parent        Category?  @relation("CategoryHierarchy", fields: [parentCategoryId], references: [id], onDelete: SetNull, onUpdate: Cascade)
  subcategories Category[] @relation("CategoryHierarchy")
  items         Item[]

  @@map("categories")
  @@index([cafeId, isActive, sortOrder])
}

model Item {
  id                     String    @id @default(cuid())
  cafeId                 String    @map("cafe_id")
  categoryId             String    @map("category_id")
  name                   String    @db.VarChar(191)
  shortCode              String?   @map("short_code") @db.VarChar(32) // e.g. "CAP-01" for staff POS
  description            String?   @db.Text
  basePricePaise         Int       @map("base_price_paise")
  preparationTimeMinutes Int       @default(15) @map("preparation_time_minutes")
  isVeg                  Boolean   @default(true) @map("is_veg")
  isEgg                  Boolean   @default(false) @map("is_egg")
  isSpicy                Boolean   @default(false) @map("is_spicy")
  isBestSeller           Boolean   @default(false) @map("is_best_seller")
  isAvailable            Boolean   @default(true) @map("is_available")
  imageUrl               String?   @map("image_url") @db.VarChar(512)
  sortOrder              Int       @default(0) @map("sort_order")
  taxPercentage          Float?    @map("tax_percentage") // Nullable: defaults to cafe GST setting
  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")
  deletedAt              DateTime? @map("deleted_at")

  cafe         Cafe          @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  category     Category      @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  optionGroups OptionGroup[]
  cartItems    CartItem[]
  orderItems   OrderItem[]

  @@map("items")
  @@index([cafeId, categoryId, isAvailable])
  @@index([cafeId, isAvailable, sortOrder])
}

model OptionGroup {
  id        String    @id @default(cuid())
  cafeId    String    @map("cafe_id")
  itemId    String    @map("item_id")
  name      String    @db.VarChar(128) // e.g., "Size", "Milk Choice", "Extra Addons"
  minSelect Int       @default(0) @map("min_select") // 0 = optional, 1+ = required
  maxSelect Int       @default(1) @map("max_select") // 1 = radio select, >1 = checkboxes
  sortOrder Int       @default(0) @map("sort_order")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  cafe    Cafe     @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  item    Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  options Option[]

  @@map("option_groups")
  @@index([cafeId, itemId, sortOrder])
}

model Option {
  id              String    @id @default(cuid())
  optionGroupId   String    @map("option_group_id")
  name            String    @db.VarChar(128) // e.g., "Almond Milk", "Large 350ml"
  priceDeltaPaise Int       @default(0) @map("price_delta_paise") // Additional price in paise
  isDefault       Boolean   @default(false) @map("is_default")
  isAvailable     Boolean   @default(true) @map("is_available")
  sortOrder       Int       @default(0) @map("sort_order")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  optionGroup OptionGroup @relation(fields: [optionGroupId], references: [id], onDelete: Cascade)

  @@map("options")
  @@index([optionGroupId, isAvailable, sortOrder])
}

// ==================== CART ====================

model Cart {
  id              String   @id @default(cuid())
  cafeId          String   @map("cafe_id")
  sessionId       String   @map("session_id")
  sessionMemberId String?  @unique @map("session_member_id")
  customerId      String?  @map("customer_id")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  cafe          Cafe           @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  session       TableSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  sessionMember SessionMember? @relation(fields: [sessionMemberId], references: [id], onDelete: Cascade)
  customer      Customer?      @relation(fields: [customerId], references: [id], onDelete: SetNull)
  items         CartItem[]

  @@map("carts")
  @@index([cafeId, sessionId])
}

model CartItem {
  id                  String   @id @default(cuid())
  cartId              String   @map("cart_id")
  itemId              String   @map("item_id")
  quantity            Int      @default(1)
  selectedOptionsJson Json?    @map("selected_options_json") // Array of { optionGroupId, optionId, name, priceDeltaPaise }
  specialInstructions String?  @map("special_instructions") @db.VarChar(255)
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  cart Cart @relation(fields: [cartId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@map("cart_items")
  @@index([cartId])
  @@index([itemId])
}

// ==================== ORDERS & KITCHEN ====================

model Order {
  id                String      @id @default(cuid())
  cafeId            String      @map("cafe_id")
  businessDayId     String?     @map("business_day_id")
  sessionId         String      @map("session_id")
  customerId        String?     @map("customer_id")
  orderNumber       String      @map("order_number") @db.VarChar(32) // e.g. "ORD-042"
  status            OrderStatus @default(pending_approval)
  subtotalPaise     Int         @map("subtotal_paise")
  taxPaise          Int         @default(0) @map("tax_paise")
  totalPaise        Int         @map("total_paise")
  customerNotes     String?     @map("customer_notes") @db.Text
  rejectionReason   String?     @map("rejection_reason") @db.Text
  approvedByUserId  String?     @map("approved_by_user_id") @db.VarChar(191)
  approvedAt        DateTime?   @map("approved_at")
  rejectedAt        DateTime?   @map("rejected_at")
  cancelledAt       DateTime?   @map("cancelled_at")
  createdAt         DateTime    @default(now()) @map("created_at")
  updatedAt         DateTime    @updatedAt @map("updated_at")
  deletedAt         DateTime?   @map("deleted_at")

  cafe        Cafe          @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  businessDay BusinessDay?  @relation(fields: [businessDayId], references: [id], onDelete: SetNull)
  session     TableSession  @relation(fields: [sessionId], references: [id], onDelete: Restrict)
  customer    Customer?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
  items       OrderItem[]
  billLines   BillLine[]

  @@map("orders")
  @@index([cafeId, status, createdAt])
  @@index([cafeId, sessionId])
  @@index([businessDayId])
}

model OrderItem {
  id                     String     @id @default(cuid())
  cafeId                 String     @map("cafe_id")
  orderId                String     @map("order_id")
  itemId                 String     @map("item_id")
  itemNameSnapshot       String     @map("item_name_snapshot") @db.VarChar(191)
  itemPriceSnapshotPaise Int        @map("item_price_snapshot_paise")
  quantity               Int        @default(1)
  optionsSnapshotJson    Json?      @map("options_snapshot_json") // Immutable snapshot of chosen options
  optionsTotalDeltaPaise Int        @default(0) @map("options_total_delta_paise")
  lineTotalPaise         Int        @map("line_total_paise") // (base + options) * quantity
  specialInstructions    String?    @map("special_instructions") @db.VarChar(255)
  status                 DishStatus @default(placed)
  kitchenNotes           String?    @map("kitchen_notes") @db.VarChar(255)
  preparedByUserId       String?    @map("prepared_by_user_id") @db.VarChar(191)
  preparedAt             DateTime?  @map("prepared_at")
  servedAt               DateTime?  @map("served_at")
  cancelledAt            DateTime?  @map("cancelled_at")
  createdAt              DateTime   @default(now()) @map("created_at")
  updatedAt              DateTime   @updatedAt @map("updated_at")

  cafe  Cafe  @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  item  Item  @relation(fields: [itemId], references: [id], onDelete: Restrict)

  @@map("order_items")
  @@index([cafeId, status, createdAt])
  @@index([orderId])
  @@index([cafeId, itemId])
}

// ==================== BILLING & PAYMENTS ====================

model Bill {
  id                 String     @id @default(cuid())
  cafeId             String     @map("cafe_id")
  businessDayId      String?    @map("business_day_id")
  sessionId          String     @map("session_id")
  customerId         String?    @map("customer_id")
  billNumber         String     @map("bill_number") @db.VarChar(64) // e.g. "INV-2026-00123"
  status             BillStatus @default(draft)
  subtotalPaise      Int        @map("subtotal_paise")
  discountPaise      Int        @default(0) @map("discount_paise")
  offerId            String?    @map("offer_id")
  serviceChargePaise Int        @default(0) @map("service_charge_paise")
  cgstPaise          Int        @default(0) @map("cgst_paise")
  sgstPaise          Int        @default(0) @map("sgst_paise")
  totalTaxPaise      Int        @default(0) @map("total_tax_paise")
  roundOffPaise      Int        @default(0) @map("round_off_paise")
  finalAmountPaise   Int        @map("final_amount_paise")
  paidAmountPaise    Int        @default(0) @map("paid_amount_paise")
  issuedAt           DateTime?  @map("issued_at")
  paidAt             DateTime?  @map("paid_at")
  voidAt             DateTime?  @map("void_at")
  voidReason         String?    @map("void_reason") @db.Text
  voidByUserId       String?    @map("void_by_user_id") @db.VarChar(191)
  invoicePdfUrl      String?    @map("invoice_pdf_url") @db.VarChar(512)
  createdAt          DateTime   @default(now()) @map("created_at")
  updatedAt          DateTime   @updatedAt @map("updated_at")

  cafe        Cafe         @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  businessDay BusinessDay? @relation(fields: [businessDayId], references: [id], onDelete: SetNull)
  session     TableSession @relation(fields: [sessionId], references: [id], onDelete: Restrict)
  customer    Customer?    @relation(fields: [customerId], references: [id], onDelete: SetNull)
  offer       Offer?       @relation(fields: [offerId], references: [id], onDelete: SetNull)
  lines       BillLine[]
  payments    Payment[]

  @@unique([cafeId, billNumber])
  @@map("bills")
  @@index([cafeId, status, createdAt])
  @@index([cafeId, sessionId])
  @@index([businessDayId])
}

model BillLine {
  id             String   @id @default(cuid())
  billId         String   @map("bill_id")
  orderId        String?  @map("order_id")
  orderItemId    String?  @map("order_item_id")
  description    String   @db.VarChar(255)
  quantity       Int      @default(1)
  unitPricePaise Int      @map("unit_price_paise")
  taxPercentage  Float    @default(0.0) @map("tax_percentage")
  totalPaise     Int      @map("total_paise")
  createdAt      DateTime @default(now()) @map("created_at")

  bill  Bill   @relation(fields: [billId], references: [id], onDelete: Cascade)
  order Order? @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@map("bill_lines")
  @@index([billId])
  @@index([orderId])
}

model Payment {
  id                       String                @id @default(cuid())
  cafeId                   String                @map("cafe_id")
  billId                   String                @map("bill_id")
  paymentMode              CustomerPaymentMode   @map("payment_mode")
  status                   CustomerPaymentStatus @default(pending)
  amountPaise              Int                   @map("amount_paise")
  tipPaise                 Int                   @default(0) @map("tip_paise")
  gatewayOrderId           String?               @map("gateway_order_id") @db.VarChar(191)
  gatewayPaymentId         String?               @map("gateway_payment_id") @db.VarChar(191)
  gatewaySignature         String?               @map("gateway_signature") @db.VarChar(255)
  counterCollectedByUserId String?               @map("counter_collected_by_user_id") @db.VarChar(191)
  transactionRef           String?               @map("transaction_ref") @db.VarChar(128) // UPI UTR or counter receipt #
  paidAt                   DateTime?             @map("paid_at")
  failureReason            String?               @map("failure_reason") @db.Text
  metadata                 Json?
  createdAt                DateTime              @default(now()) @map("created_at")
  updatedAt                DateTime              @updatedAt @map("updated_at")

  cafe    Cafe     @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  bill    Bill     @relation(fields: [billId], references: [id], onDelete: Cascade)
  refunds Refund[]

  @@map("payments")
  @@index([cafeId, status])
  @@index([billId])
  @@index([gatewayPaymentId])
}

model Refund {
  id                String       @id @default(cuid())
  cafeId            String       @map("cafe_id")
  paymentId         String       @map("payment_id")
  refundAmountPaise Int          @map("refund_amount_paise")
  reason            String       @db.VarChar(255)
  status            RefundStatus @default(pending_approval)
  requestedByUserId String?      @map("requested_by_user_id") @db.VarChar(191)
  approvedByUserId  String?      @map("approved_by_user_id") @db.VarChar(191)
  gatewayRefundId   String?      @map("gateway_refund_id") @db.VarChar(191)
  processedAt       DateTime?    @map("processed_at")
  rejectionReason   String?      @map("rejection_reason") @db.Text
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")

  cafe    Cafe    @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@map("refunds")
  @@index([cafeId, status])
  @@index([paymentId])
}

// ==================== OFFERS & PROMOTIONS ====================

model Offer {
  id                 String       @id @default(cuid())
  cafeId             String       @map("cafe_id")
  code               String       @db.VarChar(64) // e.g. "FLAT50", "DIWALI10"
  title              String       @db.VarChar(191)
  description        String?      @db.Text
  discountType       DiscountType @map("discount_type")
  discountValue      Int          @map("discount_value") // Percentage or flat amount in paise
  minOrderValuePaise Int          @default(0) @map("min_order_value_paise")
  maxDiscountPaise   Int?         @map("max_discount_paise")
  startsAt           DateTime     @map("starts_at")
  endsAt             DateTime     @map("ends_at")
  usageLimit         Int?         @map("usage_limit")
  usageCount         Int          @default(0) @map("usage_count")
  isActive           Boolean      @default(true) @map("is_active")
  createdAt          DateTime     @default(now()) @map("created_at")
  updatedAt          DateTime     @updatedAt @map("updated_at")
  deletedAt          DateTime?    @map("deleted_at")

  cafe  Cafe   @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  bills Bill[]

  @@unique([cafeId, code])
  @@map("offers")
  @@index([cafeId, isActive, startsAt, endsAt])
}

// ==================== WAITER ASSISTANCE ====================

model WaiterCall {
  id                   String           @id @default(cuid())
  cafeId               String           @map("cafe_id")
  tableId              String           @map("table_id")
  sessionId            String?          @map("session_id")
  callType             WaiterCallType   @map("call_type")
  status               WaiterCallStatus @default(active)
  notes                String?          @db.VarChar(255)
  acknowledgedByUserId String?          @map("acknowledged_by_user_id") @db.VarChar(191)
  acknowledgedAt       DateTime?        @map("acknowledged_at")
  resolvedByUserId     String?          @map("resolved_by_user_id") @db.VarChar(191)
  resolvedAt           DateTime?        @map("resolved_at")
  createdAt            DateTime         @default(now()) @map("created_at")
  updatedAt            DateTime         @updatedAt @map("updated_at")

  cafe    Cafe          @relation(fields: [cafeId], references: [id], onDelete: Cascade)
  table   Table         @relation(fields: [tableId], references: [id], onDelete: Cascade)
  session TableSession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)

  @@map("waiter_calls")
  @@index([cafeId, status, createdAt])
  @@index([tableId])
  @@index([sessionId])
}

// ==================== AUDIT TRAIL ====================

model AuditLog {
  id            String   @id @default(cuid())
  cafeId        String?  @map("cafe_id")
  userId        String?  @map("user_id")
  action        String   @db.VarChar(64) // e.g. "ORDER_APPROVED", "BILL_VOIDED", "MENU_PRICE_CHANGED"
  entityType    String   @map("entity_type") @db.VarChar(64) // e.g. "Order", "Bill", "Item"
  entityId      String   @map("entity_id") @db.VarChar(191)
  oldValuesJson Json?    @map("old_values_json")
  newValuesJson Json?    @map("new_values_json")
  ipAddress     String?  @map("ip_address") @db.VarChar(64)
  userAgent     String?  @map("user_agent") @db.VarChar(255)
  createdAt     DateTime @default(now()) @map("created_at")

  cafe Cafe? @relation(fields: [cafeId], references: [id], onDelete: SetNull)
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@map("audit_logs")
  @@index([cafeId, entityType, entityId])
  @@index([cafeId, createdAt])
  @@index([userId, createdAt])
}

// ==================== REALTIME POLLING QUEUE ====================

model RealtimeEvent {
  id          String   @id @default(cuid())
  sequenceId  BigInt   @unique @default(autoincrement()) @map("sequence_id")
  cafeId      String   @map("cafe_id")
  channel     String   @db.VarChar(128) // e.g., "cafe:clx123:orders", "cafe:clx123:kitchen"
  eventType   String   @map("event_type") @db.VarChar(64) // e.g., "order.created", "dish.status_updated"
  payloadJson Json     @map("payload_json")
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")

  cafe Cafe @relation(fields: [cafeId], references: [id], onDelete: Cascade)

  @@unique([cafeId, sequenceId])
  @@map("realtime_events")
  @@index([cafeId, channel, sequenceId])
  @@index([cafeId, sequenceId])
  @@index([expiresAt])
}
```

---

## Indexing Strategy

In a multi-tenant relational system where many cafes share a single database, index design directly dictates query latency, CPU utilization, and connection throughput. The indexing strategy follows specific structural rules:

### 1. Multi-Tenant Prefixing Principle
Every tenant query generated by the application layer includes `WHERE cafe_id = ?`. Therefore, the primary B-tree search path must lead with `cafe_id`. Composite indexes without `cafe_id` as the leading column force the MySQL query planner to perform expensive full table scans or suboptimal index merges.

### 2. Key Composite Indexes & Query Patterns

| Table | Index Columns | Targeted Query Pattern | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| `realtime_events` | `[cafe_id, channel, sequence_id]` | `WHERE cafe_id = ? AND channel = ? AND sequence_id > ? ORDER BY sequence_id ASC LIMIT 50` | **Core Polling Index**: Allows MySQL to perform an index range scan directly on the sequential watermark without touching the data pages for non-matching rows. |
| `realtime_events` | `[cafe_id, sequence_id]` | `WHERE cafe_id = ? AND sequence_id > ? ORDER BY sequence_id ASC` | Multi-channel broadcast polling fallback. |
| `realtime_events` | `[expires_at]` | `DELETE FROM realtime_events WHERE expires_at < NOW() LIMIT 2000` | High-speed garbage collection without table locks. |
| `orders` | `[cafe_id, status, created_at]` | `WHERE cafe_id = ? AND status = 'pending_approval' ORDER BY created_at ASC` | **Incoming Orders Queue**: Staff dashboard displays real-time pending approvals sorted by wait time. |
| `order_items` | `[cafe_id, status, created_at]` | `WHERE cafe_id = ? AND status IN ('confirmed', 'preparing') ORDER BY created_at ASC` | **Kitchen Display System (KDS)**: Immediate filtering of active kitchen tickets by preparation stage. |
| `table_sessions` | `[cafe_id, table_id, status]` | `WHERE cafe_id = ? AND table_id = ? AND status = 'open'` | **Table State Resolution**: Quick determination if a scanned table has an active session or requires a new one. |
| `table_sessions` | `[cafe_id, status, opened_at]` | `WHERE cafe_id = ? AND status = 'open' ORDER BY opened_at DESC` | **Floor Overview**: Active table monitoring for managers and hosts. |
| `bills` | `[cafe_id, status, created_at]` | `WHERE cafe_id = ? AND status = 'issued' ORDER BY created_at DESC` | **Pending Settlements**: Open invoices awaiting customer online payment or cash collection at counter. |
| `waiter_calls` | `[cafe_id, status, created_at]` | `WHERE cafe_id = ? AND status = 'active' ORDER BY created_at ASC` | **Waiter Dispatch Screen**: Surfaces oldest unacknowledged guest requests (water, bill, help) first. |
| `items` | `[cafe_id, category_id, is_available]` | `WHERE cafe_id = ? AND category_id = ? AND is_available = true` | **Customer Menu Display**: Fast category-wise menu rendering with out-of-stock filtering. |
| `items` | `[cafe_id, is_available, sort_order]` | `WHERE cafe_id = ? AND is_available = true ORDER BY sort_order ASC` | Full menu rendering for the Customer PWA. |
| `categories` | `[cafe_id, is_active, sort_order]` | `WHERE cafe_id = ? AND is_active = true ORDER BY sort_order ASC` | Category navigation bar ordering. |
| `customers` | `[cafe_id, phone]` | `WHERE cafe_id = ? AND phone = ?` | Customer loyalty and past order lookup on login. |
| `users` | `[cafe_id, role, is_active]` | `WHERE cafe_id = ? AND role = 'waiter' AND is_active = true` | Staff roster queries and shift management. |
| `business_days` | `[cafe_id, status]` | `WHERE cafe_id = ? AND status = 'open'` | Current operational day resolution for POS and session creation. |

### 3. Soft Delete Interaction with Indexes
When querying models that use soft deletes (`deleted_at`), queries typically append `AND deleted_at IS NULL`. For high-volume tables where rows are rarely soft-deleted, MySQL's B-Tree index efficiency remains near 100% when filtering by `cafe_id` and `status`. For archiving operations, composite indexes will be extended if historical tombstone records exceed 15% of active records.

---

## The RealtimeEvent Table Design for Polling

### 1. Architectural Motivation
On shared cPanel hosting (such as Hostinger Business Shared Hosting), persistent WebSocket daemon processes and Server-Sent Events (SSE) face severe environmental restrictions:
- WebSockets fail due to Apache/Nginx reverse proxy dropping non-HTTP handshakes.
- SSE connections drop silently due to the 120-second idle connection timeout enforced by upstream proxies.
- Background worker processes (e.g., BullMQ, PM2) are terminated periodically by shared host memory watchdogs.

To provide deterministic real-time communication, Phase 0 uses a **monotonically sequenced database event queue** polled over standard HTTP POST requests every 3 seconds.

```
+-----------------------------------------------------------------------------+
|                            Client Applications                              |
|          (Customer PWA, Kitchen Display, Waiter Screen, Staff Web)          |
+-----------------------------------------------------------------------------+
                                       |
    HTTP POST /api/realtime/poll       | Polling Cadence: 3s active / 15s idle
    Headers: Authorization (JWT)       | 
    Body: { since: 4281, channels: ["cafe:c1:orders", "cafe:c1:kitchen"] }
                                       v
+-----------------------------------------------------------------------------+
|                              Express Backend                                |
|   1. Verify JWT & extract cafeId, role, sessionId                           |
|   2. Validate channel access (Permission Matrix)                            |
|   3. Query `realtime_events` with sequence range filter                     |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                           MySQL: `realtime_events`                          |
|   SELECT sequence_id, channel, event_type, payload_json                     |
|   FROM realtime_events                                                      |
|   WHERE cafe_id = 'c1'                                                      |
|     AND channel IN ('cafe:c1:orders', 'cafe:c1:kitchen')                    |
|     AND sequence_id > 4281                                                  |
|   ORDER BY sequence_id ASC LIMIT 50;                                        |
+-----------------------------------------------------------------------------+
```

### 2. Column Specifications & Sequence Ordering

```prisma
model RealtimeEvent {
  id          String   @id @default(cuid())
  sequenceId  BigInt   @unique @default(autoincrement()) @map("sequence_id")
  cafeId      String   @map("cafe_id")
  channel     String   @db.VarChar(128)
  eventType   String   @map("event_type") @db.VarChar(64)
  payloadJson Json     @map("payload_json")
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")

  cafe Cafe @relation(fields: [cafeId], references: [id], onDelete: Cascade)

  @@unique([cafeId, sequenceId])
  @@map("realtime_events")
  @@index([cafeId, channel, sequenceId])
  @@index([cafeId, sequenceId])
  @@index([expiresAt])
}
```

- **`sequenceId` (BIGINT AUTO_INCREMENT)**:
  - Strict 64-bit monotonically increasing counter.
  - Eliminates all timing bugs associated with timestamp-based polling (`created_at > timestamp`), such as server clock skew, leap seconds, transaction commit delays, and microsecond truncation.
  - The client simply stores `lastSeenSequenceId` and passes it as `since: lastSeenSequenceId`.
- **`channel` (VARCHAR 128)**:
  - Formatted hierarchically: `cafe:{cafeId}:{domain}` or `session:{sessionId}`.
  - Examples:
    - `cafe:clx100:orders` (Staff dashboard: order creations, approvals, rejections)
    - `cafe:clx100:kitchen` (KDS: dish status transitions, preparation notes)
    - `cafe:clx100:waiter` (Waiter portal: service calls, bill requests)
    - `session:clx900` (Customer table session: shared cart updates, order status changes)
- **`payloadJson` (JSON)**:
  - Self-contained event payload (e.g., `{ orderId, orderNumber, tableNumber, status, items }`).
  - Small payloads (< 1 KB) prevent memory ballooning and allow MySQL to service poll requests entirely from the InnoDB Buffer Pool.
- **`expiresAt` (DATETIME)**:
  - Pre-calculated expiration timestamp (`NOW() + INTERVAL 24 HOUR`).
  - Read by the automated cleanup cron job to safely prune old events.

### 3. Transactional Event Publishing
Events are inserted inside the **same database transaction** that modifies the domain entity:

```typescript
// Example: Approving an order
await prisma.$transaction(async (tx) => {
  const updatedOrder = await tx.order.update({
    where: { id: orderId },
    data: { status: 'approved', approvedAt: new Date(), approvedByUserId: userId }
  });

  await tx.realtimeEvent.create({
    data: {
      cafeId: updatedOrder.cafeId,
      channel: `cafe:${updatedOrder.cafeId}:orders`,
      eventType: 'order.approved',
      payloadJson: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        approvedAt: updatedOrder.approvedAt
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24-hour TTL
    }
  });
});
```
This guarantees zero phantom events and zero missed events: if the database transaction rolls back, no event is emitted.

---

## Data Retention and Cleanup Strategy

Because shared hosting environments feature restricted disk space (typically 20 GB to 50 GB) and limited MySQL IOPS, proactive data lifecycle management is critical.

### 1. Retention Matrix

| Table | Retention Window | Cleanup Mechanism | Impact of Purge |
| :--- | :--- | :--- | :--- |
| `realtime_events` | 24 Hours | Hourly scheduled cron job | None. Events are transient delivery envelopes; durable state is already persisted in `orders`, `bills`, etc. |
| `otp_requests` | 1 Hour (validity) / 7 Days (hard delete) | Daily scheduled cron job | None. Expired verification attempts are pruned to prevent table bloat. |
| `carts` & `cart_items` | 48 Hours after session closure | Nightly scheduled cron job | Cleans up abandoned or closed shopping carts while preserving actual submitted `orders`. |
| `audit_logs` | 90 Days active (exportable to cold storage) | Monthly scheduled cron job | Historical actions older than 90 days are archived or summarized. |
| `table_sessions` (Closed) | Retained indefinitely (lean record) | Soft delete / archive after 1 year | Basic session metrics (dates, guest count) remain for yearly analytics. |

### 2. Safe Batch Deletion Protocol
Issuing an unbounded `DELETE FROM table WHERE ...` query on a table with 100,000+ rows causes long InnoDB table lockups, replication lag, and connection exhaustion. Cleanup scripts must always delete in **small indexed batches** with a limit:

```sql
-- Hourly Cron Script Execution (Hostinger cPanel Cron: 0 * * * *)
-- Command: node /home/user/public_html/server/dist/scripts/cron-cleanup.js

-- Batch deletion query pattern:
DELETE FROM realtime_events 
WHERE expires_at < NOW() 
ORDER BY expires_at ASC 
LIMIT 2000;
```

The cleanup runner executes in a loop with a 50ms pause between batches until zero rows are affected, releasing row locks and yielding CPU resources to incoming customer web traffic.

---

## Migration Notes

### 1. Character Set & Collation
The MySQL database must be configured with `utf8mb4` character set and `utf8mb4_unicode_ci` collation:
- Full 4-byte UTF-8 encoding support is mandatory for emojis in dish descriptions, customer names, and Indian regional languages (Hindi, Marathi, Gujarati, Tamil, etc.).
- `utf8mb4_unicode_ci` provides accurate multilingual sorting and accent-insensitive matching.

```sql
ALTER DATABASE cafe_qr_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### 2. Connection Pool Sizing for Hostinger
Shared hosting limits maximum concurrent MySQL connections (typically 30–50 connections per cPanel user). The Node.js Express backend must configure Prisma connection limits conservatively in the connection string:

```env
# .env production configuration
DATABASE_URL="mysql://cpanel_user:SecurePass123@127.0.0.1:3306/cpanel_cafe_qr?connection_limit=10&pool_timeout=20"
```
Setting `connection_limit=10` ensures that even during unexpected traffic surges or multi-process passenger instances, the backend will not exceed MySQL's `max_user_connections` limit.

### 3. Foreign Key Constraints & Deadlock Mitigation
- Relational cascades (`onDelete: Cascade`) are configured for child entities directly owned by parents (e.g., `CafeSettings`, `CafeDocument`, `PlanFeature`, `OptionGroup`, `Option`, `CartItem`, `OrderItem`, `BillLine`).
- Restrictive foreign keys (`onDelete: Restrict`) protect critical financial and operational records (`Order` -> `Item`, `TableSession` -> `Table`, `Subscription` -> `Plan`), preventing accidental deletion of referenced master entities.
- To prevent database deadlocks during high-volume periods:
  - Orders and order items must always be locked or updated in consistent primary key order.
  - Transactions must be kept concise (< 100ms) with no external network calls (e.g., SMS sending or Razorpay API calls) inside the Prisma `$transaction` block.

### 4. Zero-Downtime Migration Guidelines
1. **Never rename columns in a single migration**: Add the new column, dual-write in application code, backfill historical data, and drop the legacy column in a subsequent release.
2. **Deploy migrations via CLI**: Always run `npx prisma migrate deploy` in the build/deployment pipeline rather than `prisma migrate dev`.
3. **Always supply default values for new columns**: Adding non-nullable columns without default values to large tables locks the table while MySQL reconstructs the schema.

### 5. Platform Seed Initialization
Upon initial database migration, the following base seed data must be provisioned:
- **`PlatformSettings`**: Initialize the singleton row with default trial days (14), grace days (3), and platform GST rate (18%).
- **`Plan` Records**:
  - `Free Trial`: 14 Days, Price 0 Paise.
  - `Starter Monthly`: 30 Days, 99900 Paise (₹999/mo).
  - `Growth Quarterly`: 90 Days, 269900 Paise (₹2,699/quarter).
  - `Pro Yearly`: 365 Days, 999900 Paise (₹9,999/year).
- **Initial Super Admin**: Create the root platform administrator user with `role = 'super_admin'`, `cafe_id = null`, and mandatory 2FA flag enabled.
