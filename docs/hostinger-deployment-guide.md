# Hostinger Shared Hosting Deployment Guide
## Multi-Cafe QR Table Ordering Platform (v2)

This guide documents the complete, step-by-step procedure for deploying the TableQR platform to **Hostinger Cloud / Shared Web Hosting** (hPanel with CloudLinux and Phusion Passenger / Node.js Application Manager).

---

### 1. Hostinger Environment Specifications

| Component | Hostinger Specification | Platform Requirement |
| :--- | :--- | :--- |
| **Operating System** | CloudLinux 8 / 9 | Linux 64-bit |
| **Node.js Runtime** | Node.js 20.x LTS or 22.x LTS (via hPanel Selector) | Node.js 20.x LTS+ |
| **Database** | MySQL 8.0+ or MariaDB 10.6+ | MySQL 8.0+ / utf8mb4 |
| **Web Server** | LiteSpeed / Apache with mod_passenger | Passenger / Reverse Proxy |
| **WebSockets** | Disabled on shared tier | **Replaced by cursor-based short-polling** |
| **SSE** | 120s timeout limit | **Replaced by cursor-based short-polling** |
| **Cron Jobs** | Standard crontab supported via hPanel | Required for database event cleanup |

---

### 2. MySQL Database Setup in Hostinger hPanel

1. Log in to **Hostinger hPanel** $\rightarrow$ **Databases** $\rightarrow$ **Management**.
2. Click **Create New MySQL Database & User**:
   - **Database Name**: `u123456789_tableqr`
   - **Username**: `u123456789_tableqr_user`
   - **Password**: Generate a strong 32-character password.
3. Note the host (usually `localhost` or `127.0.0.1:3306`).
4. Construct the connection string:
   ```env
   DATABASE_URL="mysql://u123456789_tableqr_user:YourStrongPassword@localhost:3306/u123456789_tableqr"
   ```

---

### 3. Node.js Application Setup in hPanel

1. Navigate to **Advanced** $\rightarrow$ **Node.js** in hPanel.
2. Click **Create Application**:
   - **Node.js Version**: `20.x` (or latest LTS)
   - **Application Mode**: `Production`
   - **Application Root**: `public_html/api` (or `api.yourdomain.com`)
   - **Application Startup File**: `dist/server.js`
   - **Application URL**: `yourdomain.com/api` (or custom subdomain)
3. Under **Environment Variables**, add the required keys:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `3000` (auto-assigned by Passenger) | Application port |
| `DATABASE_URL` | `mysql://user:pass@localhost:3306/db` | MySQL connection string |
| `JWT_SECRET` | `64_char_random_hex_string` | Staff & customer token signing |
| `HMAC_SECRET` | `64_char_random_hex_string` | Table QR code HMAC signing |
| `UPLOAD_DIR` | `/home/u123456789/domains/yourdomain.com/public_html/uploads` | Persistent uploads root |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | `secret_...` | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET`| `webhook_secret_...` | Razorpay webhook signature verification |
| `CORS_ORIGIN` | `https://yourdomain.com` | Allowed frontend origin |

---

### 4. Build & Upload Deployment Artifacts

From your local machine or CI/CD runner:

```bash
# 1. Install dependencies and build all packages
pnpm install
pnpm -r build

# 2. Package production files
# - server/dist -> uploaded to public_html/api/dist
# - server/package.json & prisma -> uploaded to public_html/api/
# - apps/customer/dist -> uploaded to public_html/ (Customer PWA)
# - apps/staff/dist -> uploaded to public_html/staff/ (Staff Dashboard)
```

Folder layout on Hostinger:
```
public_html/
├── .htaccess                 # Main routing and rewrite rules
├── index.html                # Customer PWA entry
├── assets/                   # Customer PWA bundled assets
├── manifest.webmanifest      # Customer PWA manifest
├── staff/
│   ├── index.html            # Staff Dashboard entry
│   └── assets/               # Staff Dashboard bundled assets
├── uploads/
│   ├── images/               # Menu & logo images (public)
│   └── documents/            # FSSAI & trade licenses (protected)
└── api/
    ├── .env                  # Production environment variables
    ├── package.json          # Server package
    ├── dist/                 # Compiled backend JavaScript
    │   └── server.js
    └── prisma/
        └── schema.prisma     # Prisma schema for migrations
```

---

### 5. Production `.htaccess` Configuration

Create `public_html/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Enforce HTTPS
  RewriteCond %{HTTPS} !=on
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # 2. Prevent access to private document uploads (.pdf, .fssai, license docs)
  RewriteRule ^uploads/documents/.*$ - [F,L]

  # 3. Route /api/* requests to Node.js backend
  RewriteRule ^api/(.*)$ http://127.0.0.1:3000/api/$1 [P,L]

  # 4. Route /staff/* requests to Staff Dashboard SPA
  RewriteCond %{REQUEST_URI} ^/staff/
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^staff/.*$ /staff/index.html [L]

  # 5. Route customer QR scans /c/* and all customer routes to Customer PWA
  RewriteCond %{REQUEST_URI} !^/api/
  RewriteCond %{REQUEST_URI} !^/staff/
  RewriteCond %{REQUEST_URI} !^/uploads/
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Enable Gzip Compression for Fast Mobile QR Loads
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "DENY"
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

---

### 6. Database Migrations

Open Hostinger SSH Terminal (or use hPanel SSH console):

```bash
cd public_html/api
npm install --omit=dev
npx prisma migrate deploy
```

---

### 7. Scheduled Maintenance Cron Jobs

Because Hostinger shared hosting restricts long-lived WebSockets, the platform uses MySQL short-polling events. Set up the following cron jobs in **hPanel** $\rightarrow$ **Advanced** $\rightarrow$ **Cron Jobs**:

#### 1. Short-Polling Events Purge (Every 30 Minutes)
Purges consumed realtime events older than 1 hour to keep MySQL tables small and fast:
```bash
* /30 * * * * mysql -u u123456789_tableqr_user -p'YourPassword' u123456789_tableqr -e "DELETE FROM realtime_events WHERE created_at < NOW() - INTERVAL 1 HOUR;" > /dev/null 2>&1
```

#### 2. Subscription Expiry & Grace Period Monitor (Daily at 00:05 AM)
Evaluates trial and grace period boundaries:
```bash
5 0 * * * cd /home/u123456789/public_html/api && node dist/cron/check-subscriptions.js > /dev/null 2>&1
```

---

### 8. Verification & Smoke Test Checklist

Once deployed, verify:
- [ ] Health-check endpoint responds: `curl -I https://yourdomain.com/api/health` returns `HTTP 200 OK`.
- [ ] Customer QR landing: Visit `https://yourdomain.com/c/demo-cafe?t={token}` $\rightarrow$ confirms table number, prompts OTP, displays menu.
- [ ] Shared cart real-time sync: Enter 4-digit PIN on second device $\rightarrow$ items added on device A appear on device B within 2-3s.
- [ ] Staff Dashboard: Login at `https://yourdomain.com/staff` $\rightarrow$ audio chime plays on new orders.
- [ ] Kitchen Screen: Start prep $\rightarrow$ Mark done $\rightarrow$ alerts Waiter screen.
- [ ] Bill settlement: Cash received with change return calculation $\rightarrow$ settles bill and frees table.
- [ ] End Business Day: Cash drawer reconciliation matches counted cash and generates day-end audit report.
