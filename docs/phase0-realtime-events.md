# Phase 0: Realtime Events & Channels

This document outlines the architecture, data schemas, channel structures, and authorization mechanics for the real-time event system in Phase 0.

---

## Polling Architecture

Phase 0 implements a lightweight, database-backed **short-polling architecture** as the foundational real-time event distribution mechanism. This approach minimizes infrastructure complexity (avoiding WebSocket state synchronization, reconnection storms, sticky sessions, or dedicated Redis/MQTT clusters) while providing a robust, horizontally scalable baseline for order management, kitchen display, table sessions, and administrative oversight.

```
+-----------------------------------------------------------------------------------+
|                                Client Applications                                |
|   (Customer QR PWA, Waiter Portal, Kitchen Display System, Owner/Admin Console)  |
+-----------------------------------------------------------------------------------+
                                         |
          HTTP POST /api/realtime/poll   |  Short Poll every 3 seconds
          { channels: [...], since: id } |  Header: Authorization (JWT / Device Token)
                                         v
+-----------------------------------------------------------------------------------+
|                             API Gateway / Middleware                              |
|   1. Channel Authorization Check (Cafe staff / Session member / Super Admin)      |
|   2. Filter authorized channels                                                   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        PostgreSQL: `realtime_events`                              |
|   SELECT * FROM realtime_events                                                    |
|   WHERE channel = ANY(:channels) AND id > :since                                  |
|   ORDER BY id ASC LIMIT 200                                                       |
+-----------------------------------------------------------------------------------+
```

### 1. Core Mechanics

1. **3-Second Polling Interval**: Clients poll the backend endpoint `POST /api/realtime/poll` on a regular cadence (default 3 seconds when the page/tab is active). When the document is blurred or hidden (`visibilitychange`), polling drops to a relaxed interval (e.g., 10–15 seconds) to conserve resources.
2. **Sequential Event Cursoring (`lastEventId`)**: Every event committed to the `realtime_events` table receives a monotonically increasing 64-bit integer (`BIGSERIAL`). Clients track the highest `lastEventId` (passed as `since`) processed. The server queries rows where `id > since`.
3. **Database-as-Queue (`realtime_events` Table)**: Events are inserted within the same database transaction as the business operation that triggered them, guaranteeing transactional consistency (no lost updates or phantom events).
4. **Per-Channel Authentication & Authorization**: Clients pass a list of target channels in the poll request. The API validates the caller's credentials against each channel pattern before executing the query. Unauthorized channels result in an immediate rejection or are stripped from the query.

### 2. Database Schema

```sql
CREATE TABLE realtime_events (
    id BIGSERIAL PRIMARY KEY,
    channel VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compound index for fast range scans filtered by channel list
CREATE INDEX idx_realtime_events_channel_id 
    ON realtime_events (channel, id ASC);

-- Index for automated cleanup / TTL maintenance
CREATE INDEX idx_realtime_events_created_at 
    ON realtime_events (created_at);
```

### 3. Cleanup & Retention Policy

Because short polling can generate high row churn:
- Events older than a retention threshold (e.g., 24 hours in production, configurable via `cleanup(olderThanHours)`) are purged periodically by a scheduled background worker or cron task.
- Partitioning by date or table truncates can be utilized if event throughput grows beyond standard OLTP bounds.

---

## Channels & Events

### Channel: `cafe:{cafeId}:orders`

- **Description**: High-level lifecycle events for orders placed in a cafe.
- **Publisher**: Customer Ordering API, Cafe Management API.
- **Subscribers**: `owner`, `manager`

#### Events

##### 1. `order.created`
- **Publisher**: Customer Ordering API
- **Subscribers**: `owner`, `manager`
- **Description**: Triggered when a customer finishes checkout and submits a new order.

```typescript
export interface OrderCreatedPayload {
  orderId: string;
  tableNumber: string;
  sessionId: string;
  customerName: string;
  items: Array<{
    name: string;
    qty: number;
  }>;
  createdAt: string; // ISO 8601 string
}
```

##### 2. `order.approved`
- **Publisher**: Cafe Management API (Staff action)
- **Subscribers**: `owner`, `manager`
- **Description**: Triggered when a manager or owner accepts a pending order.

```typescript
export interface OrderApprovedPayload {
  orderId: string;
  approvedBy: string; // Staff user ID or staff name
}
```

##### 3. `order.rejected`
- **Publisher**: Cafe Management API (Staff action)
- **Subscribers**: `owner`, `manager`
- **Description**: Triggered when staff rejects a pending order.

```typescript
export interface OrderRejectedPayload {
  orderId: string;
  reason: string;
  rejectedBy: string;
}
```

##### 4. `order.cancelled`
- **Publisher**: Customer API / Cafe Management API
- **Subscribers**: `owner`, `manager`
- **Description**: Triggered when an order is cancelled prior to kitchen preparation.

```typescript
export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
}
```

---

### Channel: `cafe:{cafeId}:kitchen`

- **Description**: Kitchen Display System (KDS) pipeline events and ticket line-item progressions.
- **Publisher**: Kitchen API, Order Approval Service.
- **Subscribers**: `chef`, `owner`, `manager`

#### Events

##### 1. `dish.status_changed`
- **Publisher**: Kitchen Display API (Chef/Staff interaction)
- **Subscribers**: `chef`, `owner`, `manager`
- **Description**: Emitted when a dish item moves across prep states (e.g., pending -> preparing -> ready -> served).

```typescript
export interface DishStatusChangedPayload {
  orderItemId: string;
  orderId: string;
  tableNumber: string;
  sessionColor: string; // Visual session identifier
  dishName: string;
  qty: number;
  customizations?: Record<string, unknown> | string[];
  newStatus: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  oldStatus: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
  changedBy: string;
  changedAt: string; // ISO 8601 string
}
```

##### 2. `dish.undone`
- **Publisher**: Kitchen Display API
- **Subscribers**: `chef`, `owner`, `manager`
- **Description**: Triggered when kitchen staff mistakenly bumps an item and reverts it back to its previous status.

```typescript
export interface DishUndonePayload {
  orderItemId: string;
  revertedTo: string;
  revertedBy: string;
}
```

##### 3. `kitchen.new_order`
- **Publisher**: Order Approval Service (or Order API when auto-approval is enabled)
- **Subscribers**: `chef`, `owner`, `manager`
- **Description**: Pushes an approved order ticket directly to the kitchen display with sound alert metadata.

```typescript
export interface KitchenNewOrderPayload {
  orderId: string;
  tableNumber: string;
  dishes: Array<{
    id: string;
    name: string;
    qty: number;
    customizations?: Record<string, unknown> | string[];
    notes?: string;
  }>;
  soundAlert: true;
}
```

---

### Channel: `cafe:{cafeId}:tables`

- **Description**: Physical table occupancy and live dining session state transitions.
- **Publisher**: Table Management API, Session Lifecycle Engine.
- **Subscribers**: `owner`, `manager`, `waiter`

#### Events

##### 1. `table.status_changed`
- **Publisher**: Table Management Service
- **Subscribers**: `owner`, `manager`, `waiter`
- **Description**: Signals when a table becomes free, occupied, or signals a call/bill request.

```typescript
export interface TableStatusChangedPayload {
  tableId: string;
  tableNumber: string;
  status: 'free' | 'occupied' | 'bill_requested' | 'waiter_called';
  sessionId?: string;
}
```

##### 2. `table.session_opened`
- **Publisher**: QR Scan & Session Initializer Service
- **Subscribers**: `owner`, `manager`, `waiter`
- **Description**: Emitted when the first customer scans the QR code and opens an active dining session.

```typescript
export interface TableSessionOpenedPayload {
  tableId: string;
  sessionId: string;
  color: string; // Assigned hex code/color badge for grouping
}
```

##### 3. `table.session_closed`
- **Publisher**: Session Lifecycle Engine / Staff POS
- **Subscribers**: `owner`, `manager`, `waiter`
- **Description**: Emitted when the bill is settled or staff manually releases the table session.

```typescript
export interface TableSessionClosedPayload {
  tableId: string;
  sessionId: string;
}
```

---

### Channel: `cafe:{cafeId}:waiter_calls`

- **Description**: Customer assistance calls, service requests, and staff dispatch tracking.
- **Publisher**: Customer Table Session API, Waiter Calling Service.
- **Subscribers**: `waiter`, `manager`, `owner`

#### Events

##### 1. `waiter_call.created`
- **Publisher**: Customer PWA (Assistance request)
- **Subscribers**: `waiter`, `manager`, `owner`
- **Description**: Sent when a customer at a table invokes "Call Waiter".

```typescript
export interface WaiterCallCreatedPayload {
  callId: string;
  tableNumber: string;
  tableId: string;
  type: string; // e.g. 'water' | 'cutlery' | 'cleaning' | 'bill' | 'general'
  message?: string;
  customerName: string;
  createdAt: string; // ISO 8601 string
}
```

##### 2. `waiter_call.acknowledged`
- **Publisher**: Waiter Portal API
- **Subscribers**: `waiter`, `manager`, `owner`
- **Description**: Sent when a waiter marks the call as seen/in-progress.

```typescript
export interface WaiterCallAcknowledgedPayload {
  callId: string;
  acknowledgedBy: string;
}
```

##### 3. `waiter_call.resolved`
- **Publisher**: Waiter Portal API
- **Subscribers**: `waiter`, `manager`, `owner`
- **Description**: Sent when assistance has been fulfilled and the call is dismissed.

```typescript
export interface WaiterCallResolvedPayload {
  callId: string;
  resolvedBy: string;
}
```

---

### Channel: `session:{sessionId}:cart`

- **Description**: Shared cart synchronizer for collaborative ordering among guests at the same table.
- **Publisher**: Customer Cart Service.
- **Subscribers**: `customers in session`

#### Events

##### 1. `cart.item_added`
- **Publisher**: Customer Cart Service
- **Subscribers**: `customers in session`
- **Description**: Notifies all session members that an item was added to the shared cart.

```typescript
export interface CartItemAddedPayload {
  cartItemId: string;
  item: {
    name: string;
    price: number;
    qty: number;
    options?: Record<string, unknown> | string[];
  };
  addedBy: {
    name: string;
  };
}
```

##### 2. `cart.item_updated`
- **Publisher**: Customer Cart Service
- **Subscribers**: `customers in session`
- **Description**: Broadcasts quantity adjustments or option modifications made by a table member.

```typescript
export interface CartItemUpdatedPayload {
  cartItemId: string;
  changes: {
    qty?: number;
    options?: Record<string, unknown> | string[];
  };
  updatedBy: {
    name: string;
  };
}
```

##### 3. `cart.item_removed`
- **Publisher**: Customer Cart Service
- **Subscribers**: `customers in session`
- **Description**: Broadcasts removal of an item from the cart.

```typescript
export interface CartItemRemovedPayload {
  cartItemId: string;
  removedBy: {
    name: string;
  };
}
```

##### 4. `cart.cleared`
- **Publisher**: Customer Cart Service / Order Checkout Service
- **Subscribers**: `customers in session`
- **Description**: Emitted when the cart is emptied manually or converted into an order ticket.

```typescript
export interface CartClearedPayload {}
```

---

### Channel: `session:{sessionId}:status`

- **Description**: Live status feed of orders, individual dishes, and participant activities for a dining session.
- **Publisher**: Kitchen API, Order Workflow Engine, Session Service.
- **Subscribers**: `customers in session`

#### Events

##### 1. `order.status_changed`
- **Publisher**: Order Workflow Engine
- **Subscribers**: `customers in session`
- **Description**: Informs customers when their submitted order is approved, preparing, or rejected.

```typescript
export interface SessionOrderStatusChangedPayload {
  orderId: string;
  newStatus: string; // 'pending' | 'approved' | 'preparing' | 'served' | 'rejected' | 'cancelled'
  reason?: string;
}
```

##### 2. `dish.status_changed`
- **Publisher**: Kitchen KDS API
- **Subscribers**: `customers in session`
- **Description**: Granular dish progress updates visible on the customer's order tracking screen.

```typescript
export interface SessionDishStatusChangedPayload {
  orderItemId: string;
  dishName: string;
  newStatus: string;
  oldStatus: string;
}
```

##### 3. `session.member_joined`
- **Publisher**: Session Join API
- **Subscribers**: `customers in session`
- **Description**: Sent when another guest scans the table QR code and joins the collaborative session.

```typescript
export interface SessionMemberJoinedPayload {
  memberName: string;
}
```

##### 4. `session.bill_requested`
- **Publisher**: Customer PWA (Bill action)
- **Subscribers**: `customers in session`
- **Description**: Notifies all participants at the table that someone has requested the final bill.

```typescript
export interface SessionBillRequestedPayload {
  requestedBy: string;
}
```

---

### Channel: `session:{sessionId}:bill`

- **Description**: Invoicing, payment progress, and final settlement events for a table session.
- **Publisher**: Billing Service, Payment Gateway Webhooks.
- **Subscribers**: `customers in session`

#### Events

##### 1. `bill.created`
- **Publisher**: Billing Engine
- **Subscribers**: `customers in session`
- **Description**: Emitted when the server compiles orders into an official bill for the session.

```typescript
export interface BillCreatedPayload {
  billId: string;
  subtotal: number;
  tax: number;
  total: number;
  lines: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}
```

##### 2. `bill.updated`
- **Publisher**: Billing Engine / Staff POS
- **Subscribers**: `customers in session`
- **Description**: Emitted when discounts, surcharges, or split adjustments modify the bill total.

```typescript
export interface BillUpdatedPayload {
  billId: string;
  changes: Record<string, unknown>;
}
```

##### 3. `bill.settled`
- **Publisher**: Billing Engine / Staff Cashier
- **Subscribers**: `customers in session`
- **Description**: Emitted once the full amount is settled, ending payment obligations for the table.

```typescript
export interface BillSettledPayload {
  billId: string;
  paymentMode: 'cash' | 'upi' | 'card' | 'online' | string;
}
```

##### 4. `payment.completed`
- **Publisher**: Payment Gateway Webhook Receiver
- **Subscribers**: `customers in session`
- **Description**: Emitted when a digital transaction succeeds.

```typescript
export interface PaymentCompletedPayload {
  paymentId: string;
  amount: number;
}
```

##### 5. `payment.failed`
- **Publisher**: Payment Gateway Webhook Receiver
- **Subscribers**: `customers in session`
- **Description**: Emitted when a payment transaction attempt fails or is declined.

```typescript
export interface PaymentFailedPayload {
  paymentId: string;
  reason: string;
}
```

---

### Channel: `cafe:{cafeId}:subscription`

- **Description**: SaaS billing, plan limits, and subscription renewal notifications.
- **Publisher**: SaaS Billing Engine, Subscription Cron Scheduler.
- **Subscribers**: `owner`

#### Events

##### 1. `subscription.expiring`
- **Publisher**: Subscription Cron Scheduler
- **Subscribers**: `owner`
- **Description**: Warns the cafe owner that their subscription expires soon.

```typescript
export interface SubscriptionExpiringPayload {
  daysLeft: number;
  expiresAt: string; // ISO 8601 string
}
```

##### 2. `subscription.expired`
- **Publisher**: Subscription Cron Scheduler
- **Subscribers**: `owner`
- **Description**: Alerts the owner that subscription grace periods have lapsed.

```typescript
export interface SubscriptionExpiredPayload {
  expiredAt: string; // ISO 8601 string
}
```

##### 3. `subscription.renewed`
- **Publisher**: Billing Service (Payment Webhook)
- **Subscribers**: `owner`
- **Description**: Confirms successful renewal of the cafe subscription.

```typescript
export interface SubscriptionRenewedPayload {
  newExpiresAt: string; // ISO 8601 string
  planName: string;
}
```

##### 4. `subscription.plan_changed`
- **Publisher**: SaaS Billing Service / Admin
- **Subscribers**: `owner`
- **Description**: Emitted when a cafe plan tier is upgraded or downgraded.

```typescript
export interface SubscriptionPlanChangedPayload {
  oldPlan: string;
  newPlan: string;
}
```

---

### Channel: `admin:overview`

- **Description**: Platform-wide metrics, registrations, and monetary inflow events.
- **Publisher**: Cafe Onboarding Service, Billing Gateway, Aggregation Workers.
- **Subscribers**: `super_admin`

#### Events

##### 1. `cafe.registered`
- **Publisher**: Cafe Onboarding Service
- **Subscribers**: `super_admin`
- **Description**: Sent when a new cafe signs up on the platform.

```typescript
export interface CafeRegisteredPayload {
  cafeId: string;
  name: string;
  city: string;
}
```

##### 2. `verification.submitted`
- **Publisher**: Cafe Verification / KYC Service
- **Subscribers**: `super_admin`
- **Description**: Alerts platform admins that a cafe uploaded KYC credentials for verification.

```typescript
export interface VerificationSubmittedPayload {
  cafeId: string;
  name: string;
}
```

##### 3. `subscription.payment_received`
- **Publisher**: Platform Billing Gateway Service
- **Subscribers**: `super_admin`
- **Description**: Emitted when a cafe pays for a subscription plan or add-on.

```typescript
export interface SubscriptionPaymentReceivedPayload {
  cafeId: string;
  amount: number;
}
```

##### 4. `platform.stats_updated`
- **Publisher**: Platform Aggregator Worker
- **Subscribers**: `super_admin`
- **Description**: Periodic broadcast of key operational stats.

```typescript
export interface PlatformStatsUpdatedPayload {
  totalCafes: number;
  activeCafes: number;
  mrr: number; // Monthly Recurring Revenue
}
```

---

### Channel: `admin:verifications`

- **Description**: Dedicated administrative queue for managing cafe onboarding and document verification.
- **Publisher**: Cafe KYC Service, Staff Verification Review.
- **Subscribers**: `super_admin`

#### Events

##### 1. `verification.new`
- **Publisher**: Cafe KYC Service
- **Subscribers**: `super_admin`
- **Description**: Signals a new pending verification ticket requiring admin review.

```typescript
export interface VerificationNewPayload {
  cafeId: string;
  name: string;
  submittedAt: string; // ISO 8601 string
}
```

##### 2. `verification.updated`
- **Publisher**: Admin Verification Service
- **Subscribers**: `super_admin`
- **Description**: Signals a change in KYC status (e.g., under review, approved, rejected).

```typescript
export interface VerificationUpdatedPayload {
  cafeId: string;
  status: string; // e.g. 'under_review' | 'approved' | 'rejected'
}
```

---

## Channel Authorization Rules

Every short-polling request must undergo channel authorization before querying the `realtime_events` table. Unauthorized channels are strictly rejected with an HTTP `403 Forbidden` error.

| Channel Pattern | Who Can Subscribe | Authorization Mechanics |
|:----------------|:-------------------|:------------------------|
| `cafe:{cafeId}:*` | Staff of that cafe (roles: `owner`, `manager`, `chef`, `waiter`) | Validated via Staff JWT containing matching `cafeId` claim. Fine-grained roles within the cafe can subscribe according to their role (e.g. `chef` allowed on `kitchen`, `waiter` on `tables` and `waiter_calls`, `owner`/`manager` on all cafe channels). |
| `session:{sessionId}:*` | Members of that session | Validated via session cookie/header containing `sessionId` and a cryptographically signed guest device token registered in the active session member list. |
| `admin:*` | `super_admin` role only | Validated via Platform Admin JWT containing `role: 'super_admin'`. |

### Authorization Algorithm

```typescript
export function authorizeChannels(
  requestedChannels: string[],
  authContext: AuthContext
): boolean {
  for (const channel of requestedChannels) {
    const parts = channel.split(':');
    const scope = parts[0];

    if (scope === 'cafe') {
      const cafeId = parts[1];
      const subtopic = parts[2];
      
      // Must have staff credentials for the target cafe
      if (!authContext.isStaff || authContext.cafeId !== cafeId) {
        return false;
      }

      // Check role permissions per subtopic
      if (subtopic === 'subscription' && authContext.role !== 'owner') {
        return false;
      }
      if (subtopic === 'orders' && !['owner', 'manager'].includes(authContext.role)) {
        return false;
      }
      if (subtopic === 'kitchen' && !['chef', 'owner', 'manager'].includes(authContext.role)) {
        return false;
      }
      if (subtopic === 'waiter_calls' && !['waiter', 'manager', 'owner'].includes(authContext.role)) {
        return false;
      }
      if (subtopic === 'tables' && !['waiter', 'manager', 'owner'].includes(authContext.role)) {
        return false;
      }
    } else if (scope === 'session') {
      const sessionId = parts[1];
      
      // Must have valid session token with matching sessionId
      if (!authContext.sessionIds?.includes(sessionId)) {
        return false;
      }
    } else if (scope === 'admin') {
      if (authContext.role !== 'super_admin') {
        return false;
      }
    } else {
      // Unknown channel namespace
      return false;
    }
  }

  return true;
}
```

---

## Event Publishing Helper

Below is the complete TypeScript interface specification and reference database service for publishing, polling, and cleaning up real-time events.

```typescript
/**
 * Generic shape of a stored real-time event
 */
export interface RealtimeEvent<T = Record<string, unknown>> {
  id: number;
  channel: string;
  type: string;
  payload: T;
  createdAt: string;
}

/**
 * Core Realtime Service Interface
 */
export interface RealtimeService {
  /**
   * Publishes an event to a specified channel.
   * Inserts the event record into the realtime_events database table.
   *
   * @param channel Target channel identifier (e.g., 'cafe:123:orders')
   * @param type Unique event type name (e.g., 'order.created')
   * @param payload Structured event data
   */
  publish(channel: string, type: string, payload: Record<string, unknown>): Promise<void>;

  /**
   * Polls for new events across multiple authorized channels since a given event ID.
   *
   * @param channels Array of authorized channel identifiers to query
   * @param since The highest lastEventId known to the client (monotonically increasing)
   * @returns Array of RealtimeEvent objects ordered by id ASC
   */
  poll(channels: string[], since: number): Promise<RealtimeEvent[]>;

  /**
   * Purges old events from the realtime_events table to control storage bloat.
   *
   * @param olderThanHours Number of hours before which events are permanently deleted
   * @returns Count of deleted rows
   */
  cleanup(olderThanHours: number): Promise<number>;
}
```

### Reference Implementation (PostgreSQL / Knex / Kysely / pg)

```typescript
import { Pool } from 'pg';

export class PostgresRealtimeService implements RealtimeService {
  constructor(private readonly db: Pool) {}

  async publish(
    channel: string,
    type: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const query = `
      INSERT INTO realtime_events (channel, event_type, payload, created_at)
      VALUES ($1, $2, $3, NOW());
    `;
    await this.db.query(query, [channel, type, JSON.stringify(payload)]);
  }

  async poll(channels: string[], since: number): Promise<RealtimeEvent[]> {
    if (!channels || channels.length === 0) {
      return [];
    }

    const query = `
      SELECT 
        id, 
        channel, 
        event_type AS "type", 
        payload, 
        created_at AS "createdAt"
      FROM realtime_events
      WHERE channel = ANY($1) 
        AND id > $2
      ORDER BY id ASC
      LIMIT 200;
    `;

    const result = await this.db.query(query, [channels, since]);
    return result.rows.map((row) => ({
      id: Number(row.id),
      channel: row.channel,
      type: row.type,
      payload: row.payload,
      createdAt: row.createdAt.toISOString ? row.createdAt.toISOString() : String(row.createdAt),
    }));
  }

  async cleanup(olderThanHours: number = 24): Promise<number> {
    const query = `
      DELETE FROM realtime_events
      WHERE created_at < NOW() - ($1 * INTERVAL '1 hour');
    `;
    const result = await this.db.query(query, [olderThanHours]);
    return result.rowCount ?? 0;
  }
}
```

### Client Polling Loop (React Hook Example)

```typescript
import { useEffect, useRef, useState } from 'react';

export function useRealtimePoll(channels: string[], onEvent: (event: RealtimeEvent) => void) {
  const lastEventIdRef = useRef<number>(0);

  useEffect(() => {
    let isCancelled = false;

    async function poll() {
      if (channels.length === 0) return;

      try {
        const response = await fetch('/api/realtime/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channels,
            since: lastEventIdRef.current,
          }),
        });

        if (response.ok) {
          const events: RealtimeEvent[] = await response.json();
          for (const ev of events) {
            onEvent(ev);
            if (ev.id > lastEventIdRef.current) {
              lastEventIdRef.current = ev.id;
            }
          }
        }
      } catch (err) {
        console.error('Realtime polling error:', err);
      } finally {
        if (!isCancelled) {
          setTimeout(poll, 3000);
        }
      }
    }

    poll();

    return () => {
      isCancelled = true;
    };
  }, [channels.join(',')]);
}
```
