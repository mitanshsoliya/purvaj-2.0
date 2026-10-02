# PURVAJ 2.0 — Enterprise B2B Wholesale Platform

> **Final Production Release** | Version 2.0.0 | October 2026  
> Built for single-warehouse wholesale operations, multi-shop ordering, tiered B2B pricing, credit/Udhaar management, GST billing, multi-stage delivery, real-time broadcasts, and automated reporting.

---

## 1. Project Overview

**Purvaj 2.0** is an enterprise-grade B2B wholesale ordering and operations management platform designed for wholesale distributors and registered retail shops/dealers.

- **Single Central Warehouse**: Centralized inventory hub (`PURVAJ_CENTRAL_01`) managing inward goods, real-time stock reservations, pick/pack/dispatch logistics, and credit limits.
- **Retailer Partner Network**: Hundreds of registered shops/retailers log in to access store-specific wholesale pricing, instant SKU ordering, GST tax invoices, delivery tracking, and double-entry Udhaar ledger statements.
- **Real-Time Synchronization**: Live stock alerts, order status progression, and emergency broadcast dispatches via WebSockets (Socket.IO).

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  React 18 + Vite │ Tailwind CSS │ PWA Service Worker   │
│  ┌─────────────────┐             ┌───────────────────┐  │
│  │ Admin Dashboard │             │ Shop B2B Portal   │  │
│  │ (17 Modules)    │             │ (Mobile-First)    │  │
│  └────────┬────────┘             └─────────┬─────────┘  │
└───────────┼────────────────────────────────┼────────────┘
            │                                │
      HTTPS │ (TLS 1.3)                HTTPS │ (TLS 1.3)
            │                                │
┌───────────▼────────────────────────────────▼────────────┐
│              REVERSE PROXY & GATEWAY (Nginx)            │
│  • TLS Termination     • Rate Limiting (3 Tiers)        │
│  • Gzip Compression    • Static Asset Caching (1y)      │
│  • WebSocket Upgrade   • Security Headers (CSP/HSTS)    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│             APPLICATION LAYER (Express.js)              │
│  • Node.js 20 LTS (PM2 Cluster Mode / Docker Runner)    │
│  • Rate Limiting: Global (500/15m), Auth (20/15m)       │
│  • Security Middleware: XSS Sanitizer, UUID Validator   │
│  • JWT Access (15m) + Refresh (7d) Auth & RBAC          │
│  • 16 API Route Services with Parameterized Queries     │
│  • Error Handler with Unique Error Reference IDs        │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
┌──────────────▼────────────┐ ┌────────────▼──────────────┐
│  DATABASE (PostgreSQL 16) │ │ REAL-TIME (Socket.IO v4)  │
│  • Supabase / Self-hosted │ │ • Room-Based Isolation    │
│  • 20-Connection Pool     │ │ • Order Lifecycle Events  │
│  • Foreign Key Integrity  │ │ • Push Broadcast Alerts   │
│  • Row-Level DB Locks     │ └───────────────────────────┘
│  • 34 Performance Indexes │
└───────────────────────────┘
```

---

## 3. Core Features

### Admin Operations Console (`/admin`)
- **Wholesale Catalog**: Bulk product master with SKU, barcode, unit pricing, GST rates, HSN codes, and category hierarchies.
- **Inventory Management**: Central warehouse stock tracking, inward receipts, manual adjustments with audit reason codes, and low-stock reorder thresholds.
- **Order Pipeline**: End-to-end fulfillment (`PENDING` → `CONFIRMED` → `PACKED` → `SHIPPED` → `DELIVERED`).
- **GST Billing & Invoices**: Automated sequential tax invoice generation (`INV-YYYY-XXXX`), CGST/SGST/IGST breakdown, printable PDF layouts, and payment linking.
- **Payments & Collections**: Online gateway verification, cash desk logging, partial payments, payment refunds, and settlement audits.
- **Credit & Udhaar Engine**: Shop credit limit approval, running ledger statements, payment receipts, and balance calculations.
- **Delivery Management**: Single-warehouse dispatch routing, driver/vehicle assignments, status transitions, and timeline history.
- **Broadcast Center**: Targeted instant push announcements with category filters and real-time Socket.IO broadcasts.
- **Advanced Reports**: Sales summaries, payment breakdowns, product velocities, stock valuation, and RFC 4180 CSV exports.

### Shop Retailer Portal (`/shop`)
- **Mobile-First PWA**: High-performance mobile UI designed for rapid ordering on smartphones and tablets with offline asset caching.
- **Store-Specific Pricing**: Tiered wholesale custom prices applied automatically based on retailer agreement.
- **Quick Order**: Instant bulk ordering by SKU and barcode scanning.
- **1-Click Reorder**: Re-order frequently purchased inventory with updated real-time pricing and stock validation.
- **Digital Invoices**: Instant download and inspection of GST tax invoices with payment breakdown.
- **Delivery Timeline**: 6-stage visual tracking showing confirmation, packing, dispatch, driver contact, and proof of delivery.
- **Live Ledger**: Running financial ledger showing invoices, payments, credit notes, and outstanding Udhaar.

---

## 4. Installation

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: v15+ or Supabase instance
- **Docker & Docker Compose** (optional for containerized deployment)

### Setup Commands
```bash
# 1. Clone repository
git clone https://github.com/mitanshsoliya/purvaj-2.0.git
cd "purvaj 2.0"

# 2. Install workspace root dependencies
npm install

# 3. Install server dependencies
cd server
npm install

# 4. Install client dependencies
cd ../client
npm install
cd ..
```

---

## 5. Environment Variables

### Server Configuration (`server/.env`)
Copy `server/.env.example` to `server/.env` and configure:

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Environment mode (`production` disables demo tokens & stack traces) |
| `PORT` | Yes | `5000` | Backend API port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection URI (`postgresql://user:pass@host:5432/dbname`) |
| `DATABASE_SSL` | Yes | `true` | Enable SSL for remote DB connections (Supabase requires true) |
| `JWT_SECRET` | Yes | - | 64+ char random secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | - | 64+ char random secret for refresh tokens |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed frontend origin for CORS enforcement |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in ms (15 minutes) |
| `RATE_LIMIT_MAX` | No | `500` | Max requests per IP in the window |
| `RAZORPAY_KEY_ID` | Optional | - | Razorpay API key ID for payment gateway |
| `RAZORPAY_KEY_SECRET`| Optional | - | Razorpay secret for signature verification |
| `TWILIO_ACCOUNT_SID` | Optional | - | SMS gateway account SID |
| `TWILIO_AUTH_TOKEN`  | Optional | - | SMS gateway auth token |

> [!IMPORTANT]
> Generate production JWT secrets with:  
> `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Client Configuration (`client/.env`)
Copy `client/.env.example` to `client/.env`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | `/api` | Base URL for REST API requests |
| `VITE_SOCKET_URL` | Yes | `/` | WebSocket URL for Socket.IO |

---

## 6. Database Setup & Migrations

```bash
# Step 1: Initialize database schema (tables, foreign keys, constraints)
psql "$DATABASE_URL" -f server/src/db/schema.sql

# Step 2: Seed default roles, products, categories, brands, and warehouse
psql "$DATABASE_URL" -f server/src/db/seeds.sql

# Step 3: Verify database connection and indexes
node server/src/test-db.js
```

---

## 7. Development Mode

Run both frontend and backend concurrently from the root:
```bash
# Run both servers with unified colored terminal logging
npm run dev

# Or run separately:
npm run dev:server   # Starts backend on http://localhost:5000
npm run dev:client   # Starts Vite on http://localhost:5173
```

---

## 8. Production Build

```bash
# Build the client production bundle
npm run build

# Output will be located in client/dist/ (2.6s build, route-split chunks)
```

---

## 9. Production Deployment

### Option A: Docker Compose (Recommended)
```bash
# Build and launch all services in background
docker compose up -d --build

# View container logs
docker compose logs -f

# Verify running services
docker compose ps
```

### Option B: PM2 Process Manager + Nginx
```bash
# 1. Build client assets
cd client && npm run build && cd ..

# 2. Start Express server in PM2 cluster mode
pm2 start ecosystem.config.cjs --env production

# 3. Save PM2 state for system reboot persistence
pm2 save
pm2 startup

# 4. Copy Nginx configuration and reload
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t && sudo systemctl reload nginx
```

---

## 10. Database Backup & Restore

### Automated Backup
```bash
# Linux / macOS (bash)
chmod +x scripts/backup.sh
./scripts/backup.sh

# Windows (PowerShell)
.\scripts\backup.ps1 -BackupDir "D:\purvaj_backups" -RetentionDays 30
```
- Creates custom-format compressed dumps: `purvaj_backup_YYYYMMDD_HHMMSS.dump`.
- Automatically prunes archives older than 30 days.

### Database Restore
```bash
# Linux / macOS (bash)
chmod +x scripts/restore.sh
./scripts/restore.sh /path/to/purvaj_backup_20261002_203000.dump

# Windows (PowerShell)
.\scripts\restore.ps1 -BackupFile "D:\purvaj_backups\purvaj_backup_20261002_203000.dump"
```
*(Includes interactive safety confirmation prompt to prevent accidental data overwrites)*

---

## 11. Monitoring & Health Probes

Purvaj 2.0 exposes dedicated orchestration probes for Kubernetes, Docker, and uptime monitoring:

| Endpoint | Probe Type | Description |
|---|---|---|
| `GET /api/health` | Diagnostic | Returns DB connection status, latency (ms), uptime, and memory usage |
| `GET /api/health/ready` | Readiness | Returns `200 { ready: true }` if DB pool is responsive; `503` if DB down |
| `GET /api/health/live` | Liveness | Returns `200 { alive: true }` verifying Express event loop is healthy |

```bash
# Test health endpoint:
curl http://localhost:5000/api/health
```

---

## 12. Security Hardening

Purvaj 2.0 complies with strict B2B e-commerce security standards:
- **No Hardcoded Secrets**: Application fails immediately on boot if `JWT_SECRET` is unset in production.
- **Demo Token Isolation**: Demo tokens are gated behind `NODE_ENV !== 'production'`.
- **CORS Lockdown**: Wildcard `*` disabled in production; only explicit `CLIENT_URL` allowed.
- **SQL Injection Immune**: 100% of database queries use parameterized `$N` placeholders.
- **XSS Sanitization**: Input sanitizer strips `<script>` tags, iframe injections, and malicious event handlers from request payloads.
- **Error Obfuscation**: Production errors return sanitized JSON with an error reference ID (`ref`), completely preventing stack trace or database schema leaks.
- **Multi-Tier Rate Limiting**:
  - Global API: 500 requests / 15 minutes
  - Authentication (`/api/auth/login`): 20 requests / 15 minutes (brute-force defense)
  - File Uploads (`/api/upload`): 50 requests / 15 minutes
- **Financial Validation**: Order totals and line-item prices are derived **strictly from server-side database records**, ignoring any client payload price tampering.
- **Strict Shop Isolation**: Shop users cannot query, modify, or inspect records belonging to other registered shops (enforced with 403 Forbidden).

---

## 13. Quality Assurance & Test Verification

Automated test suites verify system integrity across all subsystems:

```bash
# 1. Final Production QA Suite (31 Tests: Auth, Catalog, Orders, Invoices, RBAC, DB Constraints)
node server/src/test-final-production-qa.js

# 2. Prompt 9 QA Suite (31 Tests: Payments, Udhaar, Delivery, Messaging, Reports)
node server/src/test-prompt9-qa.js

# 3. Security Hardening Suite (17 Tests: Probes, XSS, SQLi, Error Masking, Isolation)
node server/src/test-security-audit.js
```

**Total Verified Automated Tests**: 79 PASSED, 0 FAILED.

---

## License & Ownership
Copyright © 2026 Purvaj Wholesale Distribution. All rights reserved.
Unlicensed proprietary software.
