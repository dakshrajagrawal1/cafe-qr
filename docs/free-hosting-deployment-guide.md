# 🚀 100% Free Cloud Hosting & App Deployment Guide (Android APK & iOS)

This guide details how to host your entire **CafeQR** platform **100% Free Forever** with separate apps for:
1. **Customer App** (`apps/customer`)
2. **Cafe Owner App** (`apps/staff?mode=owner`)
3. **Cafe Manager App** (`apps/staff?mode=manager`)
4. **Waiter App** (`apps/staff?mode=waiter`)
5. **Kitchen Display System (KDS)** (`apps/staff?mode=kitchen`)
6. **Platform Owner App (Super Admin)** (`apps/staff?mode=admin`)

All 6 apps connect to **one common real-time database**.

---

## 🏛️ Free Tier Infrastructure Overview

| Component | Free Provider | Free Tier Quota | Cost |
| :--- | :--- | :--- | :--- |
| **Central Database** | **TiDB Serverless** | 5 GB storage forever, 50M request units/mo | **₹0 / mo** |
| **Backend API Server** | **Render.com** | 750 free instance hours/mo, automatic SSL, Webhooks | **₹0 / mo** |
| **Customer App** | **Cloudflare Pages** | Unlimited requests, unlimited bandwidth, global edge CDN | **₹0 / mo** |
| **Staff & Admin App** | **Cloudflare Pages** | Unlimited requests, unlimited bandwidth, global edge CDN | **₹0 / mo** |
| **Android APKs** | **GitHub Actions** | 2,000 free runner minutes/mo (builds real `.apk` files) | **₹0 / mo** |
| **iOS Installation** | **iOS Native PWA** | 1-Tap Home Screen Standalone installation (no \$99 Apple fee) | **₹0 / mo** |

---

## 🗄️ Step 1: Set Up Free Cloud MySQL Database (TiDB Serverless)

1. Go to [https://tidbcloud.com](https://tidbcloud.com) and create a free account.
2. Click **Create Cluster** ➔ Select **Serverless (Free Tier)**.
3. Choose the region closest to you (e.g. `ap-south-1` Mumbai or `ap-southeast-1` Singapore).
4. Click **Connect** ➔ Copy the MySQL connection string:
   ```env
   DATABASE_URL="mysql://<USERNAME>:<PASSWORD>@<HOST>:4000/cafeqr?sslaccept=strict"
   ```
5. In your local terminal, initialize the schema:
   ```powershell
   cd "d:\cafe qr\server"
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

---

## ⚙️ Step 2: Deploy Backend API on Render.com (Free)

1. Push your repository to **GitHub**:
   ```powershell
   git add .
   git commit -m "feat: multi-app distribution & fixed QR generator"
   git push origin main
   ```
2. Go to [https://render.com](https://render.com) and sign in with GitHub.
3. Click **New +** ➔ **Web Service** ➔ Connect your `cafe-qr` repository.
4. Set the following settings:
   - **Name**: `cafeqr-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `node dist/index.js`
   - **Instance Type**: **Free**
5. Add **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=your_tidb_connection_string
   JWT_ACCESS_SECRET=your_super_secret_jwt_key_at_least_32_chars
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_at_least_32_chars
   TABLE_TOKEN_SECRET=your_hmac_secret_for_permanent_fixed_table_qrs
   CUSTOMER_APP_URL=https://cafeqr-customer.pages.dev
   CORS_ORIGINS=https://cafeqr-customer.pages.dev,https://cafeqr-staff.pages.dev
   SUPER_ADMIN_EMAIL=admin@cafeqr.com
   SUPER_ADMIN_PASSWORD=Admin@12345
   ```
6. Click **Deploy Web Service**. You will receive your live API URL:
   `https://cafeqr-api.onrender.com`

---

## 🌐 Step 3: Deploy Frontends on Cloudflare Pages (Free)

### 3.1 Customer App
1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) ➔ **Workers & Pages** ➔ **Create Application** ➔ **Pages** ➔ **Connect to Git**.
2. Select your repository.
3. Configure build settings:
   - **Project Name**: `cafeqr-customer`
   - **Root Directory**: `apps/customer`
   - **Build Command**: `pnpm build`
   - **Build Output Directory**: `dist`
   - **Environment Variable**:
     - `VITE_API_URL`: `https://cafeqr-api.onrender.com`
4. Click **Save and Deploy**. (URL: `https://cafeqr-customer.pages.dev`)

### 3.2 Staff & Management App (Includes All 5 Staff Roles + Download Hub)
1. In Cloudflare Pages, click **Create Application** again.
2. Configure build settings:
   - **Project Name**: `cafeqr-staff`
   - **Root Directory**: `apps/staff`
   - **Build Command**: `pnpm build`
   - **Build Output Directory**: `dist`
   - **Environment Variable**:
     - `VITE_API_URL`: `https://cafeqr-api.onrender.com`
3. Click **Save and Deploy**. (URL: `https://cafeqr-staff.pages.dev`)

---

## 📱 Step 4: Separate App URLs & Distribution Links

Your single deployment generates dedicated entry points for every role:

| App | Live Web URL | Android APK Option | iOS Home Screen App |
| :--- | :--- | :--- | :--- |
| **📱 Customer App** | `https://cafeqr-customer.pages.dev` | 1-Tap WebAPK / APK | Safari ➔ "Add to Home Screen" |
| **👑 Cafe Owner App** | `https://cafeqr-staff.pages.dev?mode=owner` | 1-Tap WebAPK / APK | Safari ➔ "Add to Home Screen" |
| **💼 Cafe Manager App** | `https://cafeqr-staff.pages.dev?mode=manager` | 1-Tap WebAPK / APK | Safari ➔ "Add to Home Screen" |
| **🤵 Waiter App** | `https://cafeqr-staff.pages.dev?mode=waiter` | 1-Tap WebAPK / APK | Safari ➔ "Add to Home Screen" |
| **🍳 Kitchen Display (KDS)** | `https://cafeqr-staff.pages.dev?mode=kitchen` | 1-Tap WebAPK / APK | Safari ➔ "Add to Home Screen" |
| **🛡️ Platform Super Admin** | `https://cafeqr-staff.pages.dev?mode=admin` | 1-Tap WebAPK / APK | Safari ➔ "Add to Home Screen" |
| **📲 App Download Hub** | `https://cafeqr-staff.pages.dev?tab=downloads` | Universal Downloader | Interactive Setup Guide |

---

## 🤖 Step 5: Android APK Installation vs iOS Installation

### For Android:
1. Open any of the app URLs in Google Chrome.
2. Chrome automatically prompts: **"Install CafeQR App"** (or tap 3 dots ➔ **"Install App"**).
3. It installs as a real native app on the home screen with its own icon, launcher, and full-screen window without browser address bars!
4. Alternatively, download the compiled `.apk` directly from GitHub Actions releases.

### For iOS (iPhone / iPad):
Apple strictly does not allow installing raw `.apk` files and charges \$99/year for the App Store. However, iOS provides **Progressive Web App (PWA)** capabilities:
1. Open the app link in **Safari**.
2. Tap the **Share icon** (`[↑]`) at the bottom.
3. Tap **"Add to Home Screen"** (`[➕]`).
4. Tap **"Add"**.
5. The standalone icon is added to the iPhone home screen. When tapped, it launches in full-screen standalone mode with zero browser bars, push notifications, and fast loading.
