# PURVAJ 2.0 - B2B Wholesale Platform

**Purvaj 2.0** is an enterprise-grade B2B wholesale ordering and business management platform designed for wholesale distributors and registered retail shops/dealers.

---

## Business Model Architecture

- **Single Central Warehouse**: There is ONE main business/warehouse hub managing central inventory, bulk inward goods, and regional dispatches.
- **Retailer Partner Network**: Hundreds of registered shops/retailers log in to access tiered wholesale pricing, instant bulk ordering, GST invoices, and credit/Udhaar ledger statements.
- **Dashboards**:
  1. **Admin Operations Console (`/admin`)**: Real-time catalog management, inward stock receipts, fulfillment pipeline, GST billing, and retailer credit approval.
  2. **Shop Retailer Portal (`/shop`)**: Mobile-first wholesale portal with quick SKU entry, repeat ordering, tax invoices, and live order tracking.

---

## Tech Stack

### Frontend (`/client`)
- **React 18** with **Vite**
- **Tailwind CSS** with dark mode support (`darkMode: 'class'`)
- **Lucide Icons**
- **React Router v6/v7**
- **Axios** with JWT bearer interceptors
- **TanStack Query** for asynchronous server state
- **Design Tokens**: Dark navy sidebar (`#0F172A`), professional blue primary accent (`#2563EB`), crisp workspaces.

### Backend (`/server`)
- **Node.js** & **Express.js** REST API
- **Socket.IO** for live order updates
- **JWT (JSON Web Tokens)** & **bcrypt**
- **PostgreSQL / Supabase** compatible connection pool
- **Helmet** & **CORS** security middleware

---

## Directory Structure

```
purvaj 2.0/
├── client/                      # React + Vite Frontend
│   ├── public/
│   │   └── favicon.svg          # Purvaj 2.0 SVG branding icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Reusable UI component library
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── ConfirmationDialog.jsx
│   │   │   │   ├── DatePicker.jsx
│   │   │   │   ├── Drawer.jsx
│   │   │   │   ├── EmptyState.jsx
│   │   │   │   ├── ErrorState.jsx
│   │   │   │   ├── Input.jsx
│   │   │   │   ├── KPICard.jsx
│   │   │   │   ├── LoadingState.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── ModulePlaceholder.jsx
│   │   │   │   ├── Pagination.jsx
│   │   │   │   ├── SearchBar.jsx
│   │   │   │   ├── Select.jsx
│   │   │   │   ├── StatusBadge.jsx
│   │   │   │   └── Table.jsx
│   │   │   └── layout/          # Layout & Navigation
│   │   │       ├── AppShell.jsx
│   │   │       ├── BrandLogo.jsx
│   │   │       ├── Breadcrumbs.jsx
│   │   │       ├── DateRangeSelector.jsx
│   │   │       ├── Header.jsx
│   │   │       ├── MobileBottomNav.jsx
│   │   │       ├── ShopMobileHeader.jsx
│   │   │       ├── Sidebar.jsx
│   │   │       └── ThemeToggle.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ThemeContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── pages/
│   │   │   ├── admin/           # Admin Dashboard & Operations modules
│   │   │   ├── auth/            # Sign In Portal with Role Switcher
│   │   │   ├── common/          # 404 & 403 Pages
│   │   │   └── shop/            # Mobile-first Shop Dashboard modules
│   │   ├── routes/
│   │   │   ├── AppRoutes.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── RoleRoute.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── styles/
│   │       ├── designTokens.js
│   │       └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                      # Node.js + Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # PostgreSQL / Supabase pool
│   │   ├── routes/
│   │   │   ├── authRoutes.js    # JWT authentication
│   │   │   └── healthRoutes.js  # System readiness & warehouse node
│   │   └── server.js            # Master Express & Socket.IO server
│   ├── .env.example
│   └── package.json
├── package.json                 # Monorepo command runner
└── README.md
```

---

## Quick Start

### 1. Run Development Environment
From the root directory:
```bash
# Run Frontend
npm run dev

# Run Backend Server (in separate terminal)
npm run dev:server
```

Frontend will be available at: `http://localhost:5173`
Backend API will be available at: `http://localhost:5000`

---

## Core Available Routes

### Admin Portal (`/admin`)
- `/admin` - Wholesale Operations Console
- `/admin/products` - Wholesale Product Master
- `/admin/categories` - Category Hierarchy
- `/admin/brands` - Brand Partnerships
- `/admin/pricing` - B2B Wholesale Pricing Rules
- `/admin/inventory` - Central Warehouse Stock
- `/admin/orders` - Order Fulfillment Pipeline
- `/admin/billing` - Invoices & GST Bills
- `/admin/shops` - Retail Partner Directory
- `/admin/payments` - Collections & Udhaar Ledger
- `/admin/offers` - Schemes & Bulk Promotions
- `/admin/returns` - Claims & Replacements
- `/admin/delivery` - Dispatch & Transport
- `/admin/communication` - Broadcast Center
- `/admin/reports` - Analytics & Accounting
- `/admin/staff` - RBAC & Permissions
- `/admin/settings` - Platform Configuration

### Shop Retailer Portal (`/shop`)
- `/shop` - Mobile-First Shop Dashboard
- `/shop/products` - Wholesale Catalog
- `/shop/quick-order` - Instant SKU Bulk Order
- `/shop/cart` - Wholesale Cart
- `/shop/orders` - Order Tracking & History
- `/shop/reorder` - 1-Click Repeat Orders
- `/shop/bills` - Tax Invoices & Challans
- `/shop/payments` - Payment History
- `/shop/outstanding` - Udhaar Ledger & Balance
- `/shop/notifications` - Broadcast Alerts
- `/shop/offers` - Tiered Wholesale Discounts
- `/shop/profile` - Business KYC & Terms
- `/shop/help` - Warehouse Support Desk
