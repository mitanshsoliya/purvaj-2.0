import React from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Zap,
  ShoppingCart,
  Receipt,
  Scale,
  Gift,
  ArrowRight,
  Package,
  Clock,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import KPICard from '../../components/common/KPICard';
import EmptyState from '../../components/common/EmptyState';

export const ShopDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Retailer Identity & Credit Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-850 to-brand-900 text-white rounded-2xl p-5 sm:p-6 shadow-soft-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/30 text-brand-300 border border-brand-400/30 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                Verified Retailer Account
              </span>
              <span className="text-xs text-slate-300 font-mono">
                GSTIN: {user?.gstin || '24AAACP1234M1Z2'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {user?.shopName || 'Shree Krishna Traders'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Connected to Purvaj 2.0 Central Warehouse • Fast Wholesale Dispatch
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/shop/quick-order">
              <Button
                variant="primary"
                size="md"
                icon={Zap}
                className="bg-brand-500 hover:bg-brand-600 shadow-soft-sm text-white font-semibold"
              >
                Quick Bulk Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Account Financial Metrics (Real placeholders, no fake sales data) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-700/60">
          <div>
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider">
              Assigned Credit Limit
            </span>
            <span className="text-base sm:text-lg font-bold text-white mt-0.5 block">
              ₹2,50,000
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider">
              Outstanding Udhaar
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-300 mt-0.5 block">
              —
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider">
              Available Credit
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 block">
              —
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider">
              Active Orders
            </span>
            <span className="text-base sm:text-lg font-bold text-brand-300 mt-0.5 block">
              —
            </span>
          </div>
        </div>
      </div>

      {/* Mobile-first Quick Action Buttons Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Wholesale Order Tools
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/shop/products"
            className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-soft hover:border-brand-500 transition-colors"
          >
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mb-2">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Browse Catalog
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Wholesale Pricing
            </span>
          </Link>

          <Link
            to="/shop/quick-order"
            className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-soft hover:border-brand-500 transition-colors"
          >
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mb-2">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Quick Bulk Order
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Instant SKU Entry
            </span>
          </Link>

          <Link
            to="/shop/bills"
            className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-soft hover:border-brand-500 transition-colors"
          >
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-2">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Tax Invoices
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Download GST Bills
            </span>
          </Link>

          <Link
            to="/shop/outstanding"
            className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-soft hover:border-brand-500 transition-colors"
          >
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 mb-2">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Udhaar Ledger
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Statement & Balance
            </span>
          </Link>
        </div>
      </div>

      {/* Orders Pipeline Card */}
      <Card
        title="Recent Orders & Shipments"
        subtitle="Tracking status from central warehouse"
        action={
          <Link to="/shop/orders">
            <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
              View History
            </Button>
          </Link>
        }
      >
        <EmptyState
          icon={ShoppingCart}
          title="No orders yet"
          description="You haven't placed any wholesale orders with Purvaj 2.0 yet. Start by browsing the wholesale catalog or using Quick Bulk Order."
          actionLabel="Start Wholesale Order"
          actionIcon={Package}
          onAction={() => window.location.assign('/shop/products')}
        />
      </Card>
    </div>
  );
};

export default ShopDashboard;
