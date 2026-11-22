# Phase 0: Project Folder Structure

## Overview
Monorepo using pnpm workspaces with:
- `server/` — Express.js API (TypeScript)
- `apps/customer/` — Customer PWA (React + Vite)
- `apps/staff/` — Staff dashboard (React + Vite)
- `apps/admin/` — Super admin panel (React + Vite)
- `packages/shared/` — Shared types, constants, Zod schemas

## Full Directory Tree

```
cafe-qr/
├── .env.example
├── .gitignore
├── package.json                        # Workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
│
├── docs/                               # Phase 0 documentation
│   ├── phase0-hosting-and-stack.md
│   ├── phase0-database-schema.md
│   ├── phase0-api-endpoints.md
│   ├── phase0-realtime-events.md
│   ├── phase0-permission-matrix.md
│   ├── phase0-folder-structure.md
│   └── phase0-wireframes.md
│
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types/
│           │   ├── index.ts
│           │   ├── auth.ts              # LoginRequest, TokenPayload, etc.
│           │   ├── cafe.ts              # Cafe, CafeSettings, Document types
│           │   ├── menu.ts              # Category, Item, OptionGroup, Option
│           │   ├── order.ts             # Order, OrderItem, DishStatus
│           │   ├── session.ts           # Session, SessionMember, Cart
│           │   ├── billing.ts           # Bill, Payment, Refund
│           │   ├── subscription.ts      # Plan, Subscription, PlanFeature
│           │   ├── realtime.ts          # Event types, channel names
│           │   ├── staff.ts             # User, permissions
│           │   └── admin.ts             # Admin-specific types
│           ├── constants/
│           │   ├── index.ts
│           │   ├── roles.ts             # UserRole enum, permission keys
│           │   ├── statuses.ts          # All status enums
│           │   └── features.ts          # Plan feature keys
│           └── validation/
│               ├── index.ts
│               ├── auth.schema.ts       # Login, register, OTP schemas
│               ├── cafe.schema.ts       # Cafe profile, settings schemas
│               ├── menu.schema.ts       # Category, item, option schemas
│               ├── order.schema.ts      # Order placement schema
│               └── common.schema.ts     # Pagination, ID, phone schemas
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts                      # Demo cafe, plans, super admin
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts                     # Entry: start server
│   │   ├── app.ts                       # Express app setup (middleware, routes)
│   │   ├── config/
│   │   │   ├── index.ts
│   │   │   ├── env.ts                   # Validated env vars
│   │   │   └── cors.ts                  # CORS whitelist
│   │   ├── middleware/
│   │   │   ├── index.ts
│   │   │   ├── auth.ts                  # JWT verify, extract user
│   │   │   ├── rbac.ts                  # requireRole(), requirePermission()
│   │   │   ├── tenant.ts               # Inject & enforce cafe_id
│   │   │   ├── rateLimiter.ts           # Per-route rate limits
│   │   │   ├── validate.ts             # Zod request validation
│   │   │   ├── upload.ts               # Multer config (type/size checks)
│   │   │   ├── errorHandler.ts         # Global error handler
│   │   │   └── security.ts             # Helmet, CSRF, security headers
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── token.service.ts     # JWT sign/verify/refresh
│   │   │   │   └── otp.service.ts       # OTP generation & verification
│   │   │   ├── cafe/
│   │   │   │   ├── cafe.routes.ts
│   │   │   │   ├── cafe.controller.ts
│   │   │   │   └── cafe.service.ts
│   │   │   ├── verification/
│   │   │   │   ├── verification.routes.ts
│   │   │   │   ├── verification.controller.ts
│   │   │   │   └── verification.service.ts
│   │   │   ├── menu/
│   │   │   │   ├── menu.routes.ts
│   │   │   │   ├── category.controller.ts
│   │   │   │   ├── category.service.ts
│   │   │   │   ├── item.controller.ts
│   │   │   │   ├── item.service.ts
│   │   │   │   ├── optionGroup.controller.ts
│   │   │   │   └── optionGroup.service.ts
│   │   │   ├── tables/
│   │   │   │   ├── tables.routes.ts
│   │   │   │   ├── tables.controller.ts
│   │   │   │   └── tables.service.ts
│   │   │   ├── staff/
│   │   │   ├── customer/
│   │   │   ├── session/
│   │   │   ├── orders/
│   │   │   ├── kitchen/
│   │   │   ├── waiter/
│   │   │   ├── billing/
│   │   │   ├── business-day/
│   │   │   ├── subscription/
│   │   │   ├── offers/
│   │   │   ├── realtime/
│   │   │   │   ├── realtime.routes.ts
│   │   │   │   ├── realtime.controller.ts
│   │   │   │   └── realtime.service.ts
│   │   │   ├── reports/
│   │   │   ├── admin/
│   │   │   │   ├── admin.routes.ts
│   │   │   │   ├── overview.controller.ts
│   │   │   │   ├── cafes.controller.ts
│   │   │   │   └── ... (grouped by admin sub-feature)
│   │   │   └── upload/
│   │   │       ├── upload.routes.ts
│   │   │       ├── upload.controller.ts
│   │   │       └── upload.service.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts               # Singleton Prisma client
│   │   │   ├── razorpay.ts             # Razorpay client wrapper
│   │   │   ├── qr.ts                   # QR code SVG/PNG generation
│   │   │   ├── hmac.ts                 # Sign/verify table tokens
│   │   │   ├── otp-provider.ts         # Interface + console/MSG91 impl
│   │   │   ├── audit.ts               # logAudit() helper
│   │   │   ├── realtime.ts            # publishEvent() helper
│   │   │   ├── pagination.ts          # Cursor & offset pagination
│   │   │   ├── errors.ts             # AppError, NotFoundError, etc.
│   │   │   └── id.ts                  # ULID/CUID generation
│   │   └── types/
│   │       └── express.d.ts           # Augment Request with user, cafeId
│   ├── uploads/                       # Gitignored
│   │   ├── documents/                 # Private (not served directly)
│   │   ├── images/                    # Public (served via /uploads/images)
│   │   └── temp/
│   └── tests/
│       ├── setup.ts
│       ├── helpers/
│       ├── auth.test.ts
│       ├── tenant-isolation.test.ts
│       └── ...
│
├── apps/
│   ├── customer/                      # React + Vite PWA
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   ├── sw.js
│   │   │   └── icons/
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── pages/
│   │       ├── components/
│   │       │   ├── ui/               # Reusable UI components
│   │       │   ├── menu/
│   │       │   ├── cart/
│   │       │   └── order/
│   │       ├── hooks/
│   │       │   ├── usePolling.ts     # Realtime polling hook
│   │       │   ├── useCart.ts
│   │       │   └── useAuth.ts
│   │       ├── stores/              # Zustand stores
│   │       ├── services/            # API client (axios)
│   │       ├── lib/
│   │       └── styles/
│   │
│   ├── staff/                       # Same React+Vite structure
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── Dashboard.tsx
│   │       │   ├── Orders.tsx
│   │       │   ├── Menu.tsx
│   │       │   ├── Tables.tsx
│   │       │   ├── Kitchen.tsx
│   │       │   ├── Waiter.tsx
│   │       │   ├── Reports.tsx
│   │       │   ├── Settings.tsx
│   │       │   ├── Staff.tsx
│   │       │   ├── Subscription.tsx
│   │       │   └── BusinessDay.tsx
│   │       ├── components/
│   │       │   ├── layout/          # Sidebar, header, stat cards
│   │       │   ├── orders/
│   │       │   ├── menu/
│   │       │   ├── tables/
│   │       │   └── kitchen/
│   │       └── ...
│   │
│   └── admin/                       # Same structure, admin-specific pages
│       └── src/
│           └── pages/
│               ├── Dashboard.tsx
│               ├── Cafes.tsx
│               ├── Verification.tsx
│               ├── Plans.tsx
│               ├── Subscriptions.tsx
│               ├── Payments.tsx
│               ├── AuditLog.tsx
│               └── Settings.tsx

```

## Key Design Decisions

1. **Monorepo with pnpm workspaces** — shared types prevent drift between client and server
2. **Module-based server structure** — each domain is self-contained (routes, controller, service)
3. **Shared validation** — Zod schemas used by both server middleware and client forms
4. **Upload security** — documents in private dir (not publicly served), images served via Express static with random names
5. **Test co-location** — integration tests in server/tests/, unit tests alongside modules

## Build & Deploy

| App | Build Command | Output | Served From |
|-----|--------------|--------|-------------|
| server | `tsc` | dist/ | Node.js runtime |
| customer | `vite build` | dist/ | /static/customer/ |
| staff | `vite build` | dist/ | /static/staff/ |
| admin | `vite build` | dist/ | /static/admin/ |
| shared | `tsc` | dist/ | npm package (workspace) |
