# Complete Local Testing & Verification Guide
## Multi-Cafe QR Table Ordering Platform (v2)

This guide provides everything needed to run, test, and verify every single customer, staff, kitchen, waiter, and manager workflow locally on your machine before deploying to production.

---

### 1. Prerequisites & Database Setup

The platform uses MySQL with integer paise arithmetic and Prisma ORM.

#### Option A: Using Docker (Recommended & Fastest)
A `docker-compose.yml` file is included in the project root:

```powershell
# 1. Start the local MySQL container in the background
docker compose up -d

# 2. Push schema and seed the complete demo dataset
pnpm db:setup
```

#### Option B: Using an Existing Local MySQL (XAMPP / Native MySQL)
If you already have MySQL running locally:
1. Ensure a database named `cafe_qr` exists:
   ```sql
   CREATE DATABASE cafe_qr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Update `server/.env` with your MySQL user and password:
   ```env
   DATABASE_URL="mysql://root:yourpassword@localhost:3306/cafe_qr"
   ```
3. Push schema and seed:
   ```powershell
   pnpm db:setup
   ```

---

### 2. Starting the Platform Locally

Run all services concurrently with a single command from the root directory:

```powershell
pnpm dev:all
```

Or start them individually in separate terminal windows:
```powershell
# Terminal 1: Backend API (Port 3000)
pnpm dev:server

# Terminal 2: Customer PWA (Port 5173)
pnpm dev:customer

# Terminal 3: Staff Dashboard (Port 5174)
pnpm dev:staff
```

#### Local Port Mapping:
| App / Service | URL | Description |
| :--- | :--- | :--- |
| **Backend REST & Realtime API** | `http://localhost:3000` | Express, Prisma, Short-Polling Realtime |
| **Customer Web PWA** | `http://localhost:5173` | Mobile-first QR Ordering App |
| **Staff & Kitchen Dashboard** | `http://localhost:5174` | Owner, Manager, Kitchen (KDS), Waiter Views |

---

### 3. Pre-Seeded Test Credentials

The seed script creates the demo cafe **"Chai & Bites"** (`/c/chai-bites`) with full staff roles and a pre-configured menu:

| Role | Email Login | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Platform Super Admin** | `admin@cafeqr.com` | `Admin@12345` | Global overview, approve cafes, edit plans |
| **Cafe Owner** | `vikram@chaibites.com` | `Owner@12345` | Full access, settings, financial analytics |
| **Cafe Manager** | `manager@chaibites.com` | `Manager@12345` | Orders approval, table grid, bills, no money analytics |
| **Kitchen Chef** | `kitchen@chaibites.com` | `Chef@12345` | Kitchen screen (KDS), prep timers, mark done, undo |
| **Waiter** | `waiter1@chaibites.com` | `Waiter@12345` | Waiter view, mark served, clear calls, tableside order |

#### Customer QR Test URLs (Pre-signed HMAC Tokens):
- **Table 1**: `http://localhost:5173/c/chai-bites?t=eyJjYWZlSWQiOiJjYWZlLWRlbW8tMSIsInRhYmxlSWQiOiJ0YWJsZS0xIn0.demo_signature`
- **Table 2**: `http://localhost:5173/c/chai-bites?t=eyJjYWZlSWQiOiJjYWZlLWRlbW8tMSIsInRhYmxlSWQiOiJ0YWJsZS0yIn0.demo_signature`
- *(Or navigate to `http://localhost:5173` to test table token generation)*

---

### 4. Interactive 8-Step Verification Walkthrough

Follow these 8 steps to test every single feature end-to-end:

#### Step 1: Customer Scans Table 1 QR & Logs In
1. Open the **Table 1 URL** in your browser (simulate mobile view with Chrome DevTools `Ctrl+Shift+M`).
2. You will see the **"Chai & Bites — Table 1"** welcome screen.
3. Enter customer details:
   - Name: `Rahul Sharma`
   - Phone: `9876543210`
   - Consent checkbox: Checked
4. Click **"Get Verification Code"**.
5. In development mode, the OTP is printed directly in the **Server Terminal Console** (or use the dev OTP `123456`).
6. Enter OTP $\rightarrow$ Login succeeds! Device remembers your profile.

#### Step 2: Customization & Shared Cart with Table PIN
1. On the digital menu, browse **Hot Beverages** $\rightarrow$ click **"Kullad Masala Chai"**.
2. Select customizations:
   - Size: `Large Kullad (250ml) (+₹20)`
   - Sugar: `No Sugar / Jaggery (+₹10)`
   - Special Note: `Extra ginger please`
3. Click **"Add to Cart (₹70)"**.
4. Notice the **4-digit Table PIN** displayed in the top bar (e.g., `PIN: 4829`).
5. **Simulate a second person at the same table**:
   - Open an **Incognito / Private window** at the same Table 1 URL.
   - Enter Name `Sneha` + Phone `9876543211`.
   - Enter the 4-digit PIN.
   - **Result**: Sneha instantly sees Rahul's Kullad Chai in the shared cart with `"Added by Rahul"`!

#### Step 3: Place Order & Experience Audio Alert
1. In the Cart, choose **"Pay at counter / Pay at end"**.
2. Click **"Place Order (1 item)"**.
3. Customer screen transitions to **"Waiting for cafe to confirm..."**.
4. In another browser tab, open the **Staff Dashboard**: `http://localhost:5174`.
5. Login as Manager: `manager@chaibites.com` / `Manager@12345`.
6. **Result**: Hear the crisp **two-tone audio chime ding** and see the red counter badge `🛎️ Live Orders (1)` update in real time!

#### Step 4: Manager Approval & Forgotten Dish Addition
1. On the **Live Orders** screen, view the incoming ticket for **Table 1**.
2. Notice the customer's name and phone number (`📞 9876543210`) are clearly displayed for contact.
3. Click **"✓ Approve Order"**.
4. Test adding a forgotten dish:
   - Click **"+ Add Forgotten Dish to Session"**.
   - Pick `Classic Masala Maggi`, quantity `1`.
   - Click **"Send to Kitchen ➔"**.
   - It routes straight to the kitchen as confirmed!

#### Step 5: Kitchen Screen (KDS) & Prep Workflow
1. In the sidebar, click **"🍳 Kitchen Screen"** (or login as `kitchen@chaibites.com`).
2. You will see full-screen cards for Table 1:
   - Large color-blind safe **`T-1`** badge.
   - High-contrast session color border.
   - Live waiting time counter (`⏱️ 0m ago`).
   - Customizations (`Large Kullad, No Sugar`) and customer note (`Extra ginger please`).
3. Click **"Start Prep 👨‍🍳"** $\rightarrow$ status badge changes to `preparing`.
4. Click **"Mark Done ✅"** $\rightarrow$ status changes to `ready`, customer screen shows dish is Ready!
5. Test the **"↩ Undo"** button:
   - Click **"↩ Undo"** on any ready ticket.
   - Enter reason: `Needs more boiling`.
   - Ticket reverts to `preparing` with an audit trail entry!

#### Step 6: Waiter Screen & Customer Assistance Calls
1. In the sidebar, click **"🤵 Waiter Screen"** (or login as `waiter1@chaibites.com`).
2. Switch to the customer browser tab:
   - Click **"🛎️ Waiter"** $\rightarrow$ select **"Water"** $\rightarrow$ click **"Call Waiter"**.
3. **Waiter Screen reacts instantly**:
   - Audio chime plays.
   - Top banner alerts: `🚨 CUSTOMER CALLS (1): T-1 [WATER]`.
   - Waiter clicks **"Ack"** (acknowledged), then **"Done ✓"** (cleared).
4. In the dishes list, Table 1 has ready dishes highlighted in emerald green:
   - Click **"✓ Mark Served"** $\rightarrow$ dish moves to Served!
5. Waiter can also click **"+ Take Order (T-1)"** to take an order tableside (routes to manager for approval).

#### Step 7: Settle Bill with Cash Change Calculator
1. On customer screen, click **"Request Bill / Settle"** $\rightarrow$ session status becomes `bill_requested`.
2. On staff dashboard, click **"🪑 Live Table Grid"**:
   - Table 1 card highlights yellow: `Bill Requested`.
3. Click **"💳 Settle Bill & Free Table"**:
   - Settle Bill modal opens showing itemized list, subtotal, 5% GST, and total.
4. Test **Cash Change Calculator**:
   - Select **"💵 Cash"**.
   - Total payable is e.g. `₹220.50`.
   - Customer hands a ₹500 note $\rightarrow$ click preset **"₹500"** (or type `500`).
   - **System displays in bright green**: `Change to Return: ₹279.50`.
5. Test **Split Payment**:
   - Switch to **"⚡ Split"** tab.
   - Enter `Cash: ₹100` and `Online: ₹120.50`.
   - System ensures split amounts match total.
6. Click **"✓ Settle Bill & Free Table"**:
   - **Result**: Bill is marked `paid`, Table 1 is instantly marked `Free`, and its kitchen color is released!

#### Step 8: Business Day Reconciliation & Owner Analytics
1. In the sidebar, click **"🗓️ Business Day"**:
   - View live stats: Opening float (₹2,000), total orders, cash collected, expected cash in drawer.
2. Test **End Business Day**:
   - Enter counted cash in drawer (e.g., `2221`).
   - If balanced, difference displays `₹0.00 (Balanced ✓)`.
   - Click **"🏁 End Business Day & Generate Report"**.
   - Comprehensive **Day-End Audit Report** modal opens with full revenue and cash breakdown.
3. Login as Cafe Owner (`vikram@chaibites.com` / `Owner@12345`):
   - Click **"📈 Overview & Sales"**.
   - View real-time **Stat Cards** (Total Revenue, Orders Count, Avg Order Value, Cash vs Online split progress bar).
   - View **Top Selling Dishes** ranking and **Revenue Timeline** bars.

---

### 5. Automated Test Suite Verification

Run all 14 automated unit and integration test suites at any time:

```powershell
pnpm test
```

Expected output:
```
 Test Files  14 passed (14)
      Tests  55 passed (55)
 ✓ tests/security-hardening.test.ts (5 tests)
 ✓ tests/billing-settlement.test.ts (4 tests)
 ✓ tests/business-day.test.ts (3 tests)
 ✓ tests/analytics.test.ts (3 tests)
 ✓ tests/kitchen-flow.test.ts (4 tests)
 ✓ tests/waiter-flow.test.ts (4 tests)
 ✓ tests/orders-approval.test.ts (3 tests)
 ✓ tests/tenant-isolation.test.ts (4 tests)
 ✓ tests/razorpay-webhook.test.ts (3 tests)
 ✓ tests/customer-flow.test.ts (3 tests)
 ✓ tests/hmac-qr.test.ts (4 tests)
 ✓ tests/rbac.test.ts (4 tests)
 ✓ tests/subscription-lifecycle.test.ts (8 tests)
 ✓ tests/auth.test.ts (3 tests)
```
