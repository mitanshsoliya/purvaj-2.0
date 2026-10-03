import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, Store, AlertTriangle, ArrowRight,
  Plus, RefreshCw, Clock, CheckCircle2, Truck, FileText,
  TrendingUp, Layers, Package, Users, BarChart3, ArrowUpRight,
  ShieldCheck, CreditCard, ChevronRight, Eye, Warehouse, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import KPICard from '../../components/common/KPICard';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    todaySales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    activeShops: 0,
    pendingShops: 0,
    lowStockCount: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [topShops, setTopShops] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, shopsRes, topProdsRes, salesRes, invRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: { data: {} } })),
        api.get('/orders?limit=6').catch(() => ({ data: { data: { orders: [] } } })),
        api.get('/reports/shop-performance?limit=5').catch(() => ({ data: { data: { shopPerformance: [] } } })),
        api.get('/reports/top-products?limit=5').catch(() => ({ data: { data: { topProducts: [] } } })),
        api.get('/reports/sales?days=7').catch(() => ({ data: { data: { sales: [] } } })),
        api.get('/inventory?low_stock=true&limit=5').catch(() => ({ data: { data: { inventory: [] } } })),
      ]);

      const s = statsRes.data?.data;
      if (s) {
        setStats({
          totalSales: parseFloat(s.revenue?.total_revenue || 0),
          todaySales: parseFloat(s.revenue?.today_revenue || 0),
          totalOrders: parseInt(s.orders?.total_orders || 0),
          pendingOrders: parseInt(s.orders?.pending_orders || 0),
          activeShops: parseInt(s.shops?.active_shops || 0),
          pendingShops: parseInt(s.shops?.pending_shops || 0),
          lowStockCount: parseInt(s.inventory?.low_stock_count || 0),
        });
      }

      if (ordersRes.data?.data?.orders) {
        setRecentOrders(ordersRes.data.data.orders);
      }
      if (shopsRes.data?.data?.shopPerformance) {
        setTopShops(shopsRes.data.data.shopPerformance);
      }
      if (topProdsRes.data?.data?.topProducts) {
        setTopProducts(topProdsRes.data.data.topProducts);
      }
      if (salesRes.data?.data?.sales) {
        setSalesTrend(salesRes.data.data.sales);
      }
      if (invRes.data?.data?.inventory) {
        setLowStockItems(invRes.data.data.inventory);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute max sales for SVG trend bars
  const maxSale = Math.max(...salesTrend.map((s) => parseFloat(s.total_revenue || 0)), 1000);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: Central Warehouse Hub Console */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/50">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              Central Hub: PURVAJ_MAIN_01
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
              Live Network Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Wholesale Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Real-time multi-shop order queue, warehouse fulfillment pipeline, sales velocity, and inventory alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            isLoading={loading}
            onClick={fetchDashboardData}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/admin/products')}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Top KPI Cards (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KPICard
          title="Total Wholesale Sales"
          value={`₹${stats.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          subtitle={`Today: ₹${stats.todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          iconColor="emerald"
          trend="+12%"
          trendDirection="up"
          isLoading={loading}
          onClick={() => navigate('/admin/billing')}
        />

        <KPICard
          title="Total Orders"
          value={stats.totalOrders.toString()}
          subtitle={`${stats.pendingOrders} Pending Fulfillment`}
          icon={ShoppingCart}
          iconColor="brand"
          badge={stats.pendingOrders > 0 ? `${stats.pendingOrders} Action Req.` : 'All clear'}
          isLoading={loading}
          onClick={() => navigate('/admin/orders')}
        />

        <KPICard
          title="Active Retailers"
          value={stats.activeShops.toString()}
          subtitle={`${stats.pendingShops} Pending KYC Review`}
          icon={Store}
          iconColor="indigo"
          badge={stats.pendingShops > 0 ? `${stats.pendingShops} New` : undefined}
          isLoading={loading}
          onClick={() => navigate('/admin/shops')}
        />

        <KPICard
          title="Low Stock Items"
          value={stats.lowStockCount.toString()}
          subtitle="Warehouse replenishment needed"
          icon={AlertTriangle}
          iconColor={stats.lowStockCount > 0 ? 'amber' : 'brand'}
          trendDirection={stats.lowStockCount > 0 ? 'down' : 'neutral'}
          isLoading={loading}
          onClick={() => navigate('/admin/inventory')}
        />

        <KPICard
          title="Outstanding Credit"
          value="15 Days"
          subtitle="Avg payment cycle terms"
          icon={CreditCard}
          iconColor="purple"
          isLoading={loading}
          onClick={() => navigate('/admin/payments')}
        />
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Quick Operations & Shortcuts
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Direct Enterprise Workflows</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-brand-500 hover:bg-white dark:hover:bg-slate-850 hover:shadow-soft-sm transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 w-fit mb-2 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Add Product</div>
            <div className="text-[10px] text-slate-400">Wholesale catalog</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/billing')}
            className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-500 hover:bg-white dark:hover:bg-slate-850 hover:shadow-soft-sm transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 w-fit mb-2 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Create Invoice</div>
            <div className="text-[10px] text-slate-400">GST tax bill</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/shops')}
            className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-sky-500 hover:bg-white dark:hover:bg-slate-850 hover:shadow-soft-sm transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 w-fit mb-2 group-hover:scale-110 transition-transform">
              <Store className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Shops & KYC</div>
            <div className="text-[10px] text-slate-400">Review retailers</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/orders')}
            className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-amber-500 hover:bg-white dark:hover:bg-slate-850 hover:shadow-soft-sm transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 w-fit mb-2 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">View Orders</div>
            <div className="text-[10px] text-slate-400">Fulfillment queue</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/inventory')}
            className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-purple-500 hover:bg-white dark:hover:bg-slate-850 hover:shadow-soft-sm transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 w-fit mb-2 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Stock Inward</div>
            <div className="text-[10px] text-slate-400">Inventory counts</div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/reports')}
            className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-850 hover:shadow-soft-sm transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 w-fit mb-2 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">Reports</div>
            <div className="text-[10px] text-slate-400">Sales & analytics</div>
          </button>
        </div>
      </div>

      {/* Middle Section: Visual Trend Charts & Fast Moving Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Trend Chart (2 Cols) */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                <span>Sales Velocity Trend (Past 7 Days)</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Wholesale orders billed daily in ₹ INR</p>
            </div>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
              Total: ₹{stats.totalSales.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Bar Chart Visualization */}
          {salesTrend.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              Sales trend will plot dynamically as orders are billed.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="h-40 flex items-end gap-3 sm:gap-6 px-2">
                {salesTrend.map((item, idx) => {
                  const rev = parseFloat(item.total_revenue || 0);
                  const heightPercent = Math.max(12, Math.round((rev / maxSale) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        ₹{rev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-32 flex items-end">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {item.sale_date ? new Date(item.sale_date).toLocaleDateString('en-IN', { weekday: 'short' }) : `Day ${idx + 1}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Top Selling Wholesale Products (1 Col) */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" />
              <span>Top Fast-Moving Items</span>
            </h2>
            <button
              onClick={() => navigate('/admin/products')}
              className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              All →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Top products will populate from order history.
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {p.product_name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {p.total_quantity_sold} Units
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      ₹{parseFloat(p.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Tables Split: Recent Orders & Top Shops */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Wholesale Orders (2 Cols) */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-brand-500" />
                <span>Recent Wholesale Orders</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time fulfillment requests from retail partners</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate('/admin/orders')}
            >
              View All Orders
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Retailer</th>
                  <th className="py-3 px-4 text-right">Items</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                      No wholesale orders found in database.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate('/admin/orders')}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {o.order_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{o.shop_name}</div>
                        <div className="text-[10px] text-slate-400">{o.shop_city || 'Gujarat'}</div>
                      </td>
                      <td className="py-3 px-4 text-right">{o.item_count || 1} lines</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(o.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={o.order_status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-brand-600 hover:underline inline-flex items-center gap-0.5 font-semibold">
                          <span>Process</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Ordering Shops (1 Col) */}
        <Card className="overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-sky-500" />
              <span>Top Retail Partners</span>
            </h2>
            <button
              onClick={() => navigate('/admin/shops')}
              className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              All →
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
            {topShops.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Top retail shops will appear here.
              </div>
            ) : (
              topShops.map((shop) => (
                <div
                  key={shop.id}
                  onClick={() => navigate('/admin/shops')}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {shop.shop_name}
                    </div>
                    <div className="text-[10px] text-slate-400">{shop.city} • {shop.total_orders} Orders</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-slate-900 dark:text-white">
                      ₹{parseFloat(shop.lifetime_spend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] text-brand-600 font-semibold">
                      Credit: ₹{parseFloat(shop.credit_limit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Critical Stock Replenishment Alert Bar */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 shadow-soft-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center flex-shrink-0 shadow-soft-2xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Warehouse Stock Replenishment Alert ({lowStockItems.length} Products Low)
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {lowStockItems.slice(0, 3).map((item) => `${item.product_name} (${item.available_stock} left)`).join(', ')}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/inventory')}
              className="border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex-shrink-0 bg-white/70 dark:bg-slate-900/70"
            >
              Manage Stock Inward →
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
