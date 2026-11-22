# Phase 0: Hosting Verification & Stack Decision

## Overview

This document outlines the architectural decisions and technology stack finalized for the **Cafe QR Ordering System** based on a rigorous verification of the **Hostinger Shared Hosting** environment. The primary objective is to deliver a highly reliable, responsive, multi-tenant digital ordering and management experience within the operational boundaries of shared cPanel/hPanel hosting.

---

## 1. Hostinger Shared Hosting — Verified Limits

An evaluation of Hostinger's Business Shared Hosting environment was conducted to identify strict platform boundaries and runtime restrictions. The table below summarizes these verified limits and their operational impact.

| Feature | Status | Notes |
|---------|--------|-------|
| **Node.js** | ✅ Supported | Managed via hPanel Node.js selector. Application deployment supported from Git repository or uploaded ZIP. Runs via Phusion Passenger / reverse proxy wrapper. |
| **MySQL** | ✅ Native | MySQL 8.x is the native relational database engine provided. phpMyAdmin and remote connections supported. |
| **PostgreSQL** | ❌ Not available | PostgreSQL daemon is not provisioned or installable on shared tiers. MySQL is mandatory. |
| **WebSockets** | ❌ Not supported | The web server/firewall proxy architecture (Apache + Nginx reverse proxy) intercepts and drops persistent TCP/WebSocket handshake connections. |
| **SSE (Server-Sent Events)** | ⚠️ 120s timeout | Upstream proxy enforces an aggressive 120-second idle connection timeout, leading to silent drops and erratic reconnection loops. Unreliable for mission-critical order status updates. |
| **Background workers** | ❌ Not supported | No persistent CLI daemons, PM2 cluster control, or background queue runners (e.g., BullMQ, Celery). Long-running detached processes are periodically terminated by resource watchdogs. Must rely on Hostinger scheduled cron jobs. |
| **File storage** | ✅ Disk available | Standard local filesystem storage accessible with read/write permissions. Optional external cloud storage (e.g., Cloudinary) can be integrated if disk quotas require offloading. |
| **HTTPS** | ✅ Free SSL | Free Let's Encrypt SSL certificates automatically provisioned and managed per domain/subdomain. Mandatory for secure cookies, camera permissions for QR scanning, and PWA operation. |
| **Custom ports** | ❌ Not available | No access to bind to custom public TCP ports. Applications must route through standard HTTP (80) and HTTPS (443) ports mapped via the hosting manager. |

---

## 2. Finalized Stack

Taking all hosting constraints into account, the following full-stack architecture has been finalized:

- **Backend**: **Node.js + Express.js (TypeScript)**
  - Minimal resource footprint, fast boot times, and seamless integration with Phusion Passenger under hPanel.
  - Full TypeScript support across controllers, services, middleware, and data models.
- **Database**: **MySQL 8 + Prisma ORM**
  - Prisma handles schema migrations, type-safe queries, relational consistency, and connection pool management tailored for MySQL connection limits.
- **Frontend**: **3 React Single Page Applications (Vite + TypeScript)**
  - **Customer App**: Progressive Web Application (PWA) with a mobile-first UI for guests scanning table QR codes, browsing menus, and ordering.
  - **Staff App**: Role-tailored dashboards for Owner, Manager, Chef/Kitchen Display System (KDS), and Waiters.
  - **Super Admin Panel**: Centralized management portal for tenant onboarding, subscription oversight, and global system analytics.
- **Auth**: **JWT (JSON Web Tokens)**
  - Dual-token architecture (short-lived access tokens and longer-lived refresh tokens) transmitted via secure, `httpOnly`, `SameSite=Lax` cookies.
  - Passwords hashed using `argon2` for cryptographic security.
- **Realtime**: **Short Polling (3s interval)**
  - Client-side interval queries to `/api/realtime/poll` fetching events incrementally using high-watermark event IDs.
- **File Uploads**: **Multer → Local Disk Storage**
  - Configured with random UUID/nanoid file naming, disk storage inside the app's persistent upload directory, and strict MIME type and file size validation.
- **Payments**: **Razorpay SDK**
  - Native checkout modal on the client with mandatory cryptographic signature verification and server-side amount checks prior to order finalization.
- **OTP (One-Time Password)**: **Modular Provider Interface**
  - Flexible provider abstraction supporting MSG91 and Twilio for production SMS delivery, with fallback to an in-memory/console logger for development and automated testing.
- **QR Code Engine**: **`qrcode` npm package + HMAC-signed Table Tokens**
  - Server generates dynamic or static QR images embedding signed tokens (`cafeId`, `tableId`, cryptographic signature) preventing table impersonation or URL tampering.
- **Validation**: **Zod**
  - Unified schema validation shared across client forms and server request payloads (`req.body`, `req.query`, `req.params`).
- **State Management**: **Zustand (Client)**
  - Lightweight, boilerplate-free state management for active orders, carts, sessions, and polling sync state.
- **Styling**: **Tailwind CSS**
  - Utility-first CSS compiling to lean static assets, optimized for responsive mobile views and rapid dashboard assembly.
- **Monorepo**: **pnpm workspaces**
  - Clean separation of concerns with shared TypeScript types, validation packages, client frontends, and the Express backend within a single version-controlled repository.

---

## 3. Realtime Architecture

Because persistent bi-directional WebSockets and long-lived SSE connections are not viable under Hostinger's proxy and timeout infrastructure, real-time coordination is built around **short polling backed by an append-only event table**.

### Design

1. **Database Schema (`realtime_events`)**:
   A dedicated MySQL table records all transient system notifications:
   - `id`: Auto-incrementing unsigned `BIGINT` (acts as the sequential ordering watermark).
   - `channel`: Indexed string identifier (e.g., `cafe:1:orders`).
   - `type`: Event classification string (e.g., `order.created`, `dish.status_updated`, `cart.item_added`).
   - `payload`: JSON object containing event data.
   - `created_at`: Indexed timestamp.
2. **Bootstrap & Delta Polling Flow**:
   - **On Page Load**: The frontend performs a standard REST API fetch to retrieve the full current snapshot of state (e.g., active orders, kitchen queue). The response includes the current `latestEventId`.
   - **Continuous Polling**: Every 3 seconds, an active client fires a lightweight request:
     ```http
     GET /api/realtime/poll?channels=cafe:1:orders,cafe:1:tables&since=1042
     ```
   - **Server Query**: The server executes an indexed query:
     ```sql
     SELECT id, channel, type, payload, created_at 
     FROM realtime_events 
     WHERE id > ? AND channel IN (?, ?)
     ORDER BY id ASC 
     LIMIT 100;
     ```
   - **Authorization**: The server validates that the requesting session or user token has permission to listen to each requested channel before executing the query.
   - **Client Application**: The client applies each event delta sequentially to its local Zustand store and updates `lastEventId` to the highest event ID received.
3. **Data Retention & Event Pruning**:
   - The table acts purely as a transient message log.
   - A Hostinger cron job triggers an internal endpoint (`POST /api/internal/cleanup`) every 15 minutes to delete events older than 24 hours (`DELETE FROM realtime_events WHERE created_at < NOW() - INTERVAL 24 HOUR`), keeping table size minimal and index lookups sub-millisecond.

### Channel Naming Convention

Channels are organized hierarchically to enforce tenant isolation and role boundaries:

- `cafe:{cafeId}:orders` — Emitted on new orders, payment confirmation, cancellation; monitored by waiters and managers.
- `cafe:{cafeId}:kitchen` — Emitted on item-level status updates (e.g., `preparing`, `ready`); monitored by the Kitchen Display System (KDS).
- `cafe:{cafeId}:tables` — Emitted on table occupancy changes, bill generation, and release; monitored by floor staff.
- `cafe:{cafeId}:waiter_calls` — Emitted when a guest requests assistance or physical bills.
- `session:{sessionId}:cart` — Synchronizes live cart modifications across guests sharing the same table session.
- `session:{sessionId}:status` — Direct order progression updates pushed to the customer's active session.
- `admin:overview` — Aggregated platform metrics and alerts for super administrators.

### Future Upgrade Path

The polling implementation abstracts transport behind an internal event bus interface (`EventSubscriber` / `EventEmitter`). Event structures, channel names, and client update reducers follow standard publish-subscribe conventions. If the application is subsequently migrated to a VPS, dedicated container, or cloud instance supporting persistent TCP connections:
- The backend transport can be swapped for WebSockets (via Socket.io or ws) or SSE.
- The client-side subscriber switch requires no changes to business logic, UI components, or state stores.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as MySQL

    C->>S: GET /api/data (initial state)
    S->>DB: Query current state
    DB-->>S: Data
    S-->>C: JSON response
    
    loop Every 3 seconds
        C->>S: GET /api/realtime/poll?channels=...&since=42
        S->>DB: SELECT * FROM realtime_events WHERE id > 42 AND channel IN (...)
        DB-->>S: New events
        S-->>C: [{id:43, type:'order.new', ...}, {id:44, ...}]
        Note over C: Update UI, store lastEventId=44
    end
```

---

## 4. Deployment Strategy

The deployment pipeline is optimized for Hostinger's hPanel environment and standard file-based serving structures:

```
public_html/
├── api/             # Reverse-proxied to Node.js / Express backend process
├── uploads/         # Uploaded images (menu dishes, cafe logos, QR codes)
├── staff/           # Built static assets of Staff App (Vite output)
│   ├── index.html
│   └── assets/
├── admin/           # Built static assets of Admin Panel (Vite output)
│   ├── index.html
│   └── assets/
├── index.html       # Built static assets of Customer PWA (Vite output)
└── assets/
```

- **Backend Service**:
  - Express app configured as an hPanel Node.js application.
  - Entry point file configured to boot the HTTP server on the port passed by `process.env.PORT`.
  - Dependencies installed via `pnpm install --prod` or bundled into a standalone distribution artifact.
- **Frontends**:
  - All three client apps are pre-built via Vite with appropriate base URLs:
    - Customer App: `base: '/'`
    - Staff App: `base: '/staff/'`
    - Admin Panel: `base: '/admin/'`
  - Output static build directories (`dist`) are placed directly into their respective subdirectories under `public_html/`.
  - Client-side routing fallbacks are handled via `.htaccess` rewrites so that deep links resolve to each app's `index.html`.
- **Environment Configuration**:
  - Secure `.env` file placed outside the web root or strictly protected via server config, storing:
    - Database connection string (`DATABASE_URL="mysql://user:pass@localhost:3306/cafe_qr"`)
    - JWT signing secrets and expiration intervals
    - Razorpay API keys and webhook secret
    - OTP service credentials
    - Internal cron secret token
- **Database Connectivity**:
  - Direct connection to Hostinger MySQL instance via Prisma Client.
  - Connection pooling configured to remain within Hostinger's concurrent connection limits (e.g., `connection_limit=10`).
- **Uploads & Static Storage**:
  - Disk storage directory located at `./uploads/` served either directly by Nginx/Apache static handler or through Express static middleware with strict caching headers.
- **Cron Jobs**:
  - Hostinger Scheduled Tasks (Cron) configured to invoke internal webhook/maintenance endpoints every 15 minutes:
    - `POST /api/internal/cleanup` (Header: `x-cron-secret: <SECRET_TOKEN>`) for table pruning, stale session termination, and expired OTP removal.

---

## 5. What Changed From Original Spec

To guarantee stability, avoid platform crashes, and ensure smooth operation on Hostinger Shared Hosting, several architectural adjustments were made from the initial theoretical specification:

| Original | Changed To | Reason |
|----------|-----------|--------|
| **WebSocket/Socket.io realtime** | **Short polling (3s)** | Hostinger shared hosting proxy/firewall infrastructure blocks persistent TCP/WebSocket connections. |
| **SSE fallback** | **Not used** | Upstream 120-second connection timeout causes aggressive disconnection and reconnect spikes, making polling more predictable and resilient. |
| **PostgreSQL option** | **MySQL only** | Hostinger shared hosting exclusively provides and manages MySQL databases. |
| **NestJS option** | **Express.js** | Express provides significantly lower memory consumption, faster cold starts, and frictionless compatibility with Phusion Passenger environments. |
| **Next.js (SSR)** | **React SPA (Vite)** | Running multiple SSR Node.js server processes exceeds memory quotas on shared hosting. Static SPAs serve instantaneously via Apache/Nginx. |
| **Background workers** | **Cron-triggered endpoints** | Hostinger disallows detached background worker processes (e.g., Celery, BullMQ). Scheduled tasks are invoked through internal authenticated cron endpoints. |
| **Redis for caching** | **In-memory + MySQL** | Redis instances are not available on shared hosting. Fast indexed MySQL lookups and bounded in-memory Node.js caches replace Redis. |

---

## 6. Conclusion & Next Steps

Phase 0 establishes a pragmatic, resilient architecture tailored specifically to the hosting environment. By choosing **MySQL + Express + Vite SPAs** and replacing WebSockets with an **indexed short-polling event log**, the Cafe QR Ordering System achieves real-time responsiveness and multi-tenant security without exceeding shared hosting resource constraints.
