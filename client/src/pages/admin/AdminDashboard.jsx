import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, ShoppingCart, Store, AlertTriangle, ArrowRight,
  Plus, RefreshCw, Clock, CheckCircle2, Truck, FileText,
  TrendingUp, Layers, Package, Users, BarChart3, ArrowUpRight,
  ShieldCheck, CreditCard, ChevronRight, Eye, Send, Printer,
  IndianRupee, UserCheck, PackageCheck, Megaphone
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import KPICard from '../../components/common/KPICard';
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

  // Quick Bill Generator state
  const [billShopper, setBillShopper] = useState('');
  const [billProduct, setBillProduct] = useState('');
  const [billQty, setBillQty] = useState(1);
  const [billPrice, setBillPrice] = useState(100);

  // Broadcast state
  const [broadcastMsg, setBroadcastMsg] = useState('');

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

  // Format large numbers as Lacs
  const formatSales = (val) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  // Compute max sales for SVG trend line
  const maxSale = Math.max(...salesTrend.map((s) => parseFloat(s.total_revenue || 0)), 1000);

  // Month abbreviations for chart X-axis
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: Dashboard Title Bar
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Dashboard
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Wholesale operations overview · Central Warehouse Hub
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

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: Top KPI Stats Row (4 Cards matching reference)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Sales"
          value={formatSales(stats.totalSales)}
          icon={IndianRupee}
          color="emerald"
          trend={stats.todaySales > 0 ? `+₹${stats.todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })} today` : undefined}
          trendDirection="up"
          onClick={() => navigate('/admin/reports')}
        />
        <KPICard
          title="Pending Orders"
          value={String(stats.pendingOrders)}
          icon={Clock}
          color="amber"
          subtitle={`${stats.totalOrders} total orders`}
          onClick={() => navigate('/admin/orders')}
        />
        <KPICard
          title="Low Stock Alerts"
          value={String(stats.lowStockCount)}
          icon={AlertTriangle}
          color="rose"
          subtitle="Items below minimum"
          onClick={() => navigate('/admin/inventory')}
        />
        <KPICard
          title="Connected Shopkeepers"
          value={String(stats.activeShops)}
          icon={Store}
          color="brand"
          subtitle={stats.pendingShops > 0 ? `${stats.pendingShops} pending approval` : 'All approved'}
          onClick={() => navigate('/admin/shops')}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: Left Side Stats + Analytics Chart
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Key Metrics Sidebar */}
        <Card className="p-5 lg:col-span-1">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Sales</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {formatSales(stats.totalSales)}
              </p>
              {stats.todaySales > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{((stats.todaySales / Math.max(stats.totalSales, 1)) * 100).toFixed(1)}% today
                </span>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Connected Alerts</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {stats.lowStockCount + stats.pendingOrders}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {stats.lowStockCount} stock + {stats.pendingOrders} order alerts
              </span>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shopkeepers</p>
              <p className="text-3xl font-extrabold text-brand-600 dark:text-brand-400 mt-1">
                {stats.activeShops}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Active retail partners
              </span>
            </div>
          </div>
        </Card>

        {/* Right: Analytics Line/Bar Chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-500" />
                <span>Analytics</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Revenue trend — last 7 days</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              Mediasals
            </span>
          </div>

          {/* Chart Visualization */}
          {salesTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p>Sales analytics will populate as orders are billed</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Y-Axis labels */}
              <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-[9px] text-slate-400 font-mono">
                <span>{(maxSale / 1000).toFixed(0)}K</span>
                <span>{(maxSale / 2000).toFixed(0)}K</span>
                <span>0</span>
              </div>
              
              {/* Chart Area */}
              <div className="ml-12">
                {/* SVG Line Chart */}
                <div className="relative h-48">
                  <svg
                    viewBox={`0 0 ${salesTrend.length * 80} 160`}
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines */}
                    <line x1="0" y1="0" x2={salesTrend.length * 80} y2="0" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,4" />
                    <line x1="0" y1="53" x2={salesTrend.length * 80} y2="53" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,4" />
                    <line x1="0" y1="106" x2={salesTrend.length * 80} y2="106" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,4" />
                    <line x1="0" y1="159" x2={salesTrend.length * 80} y2="159" stroke="#e2e8f0" strokeWidth="0.5" />

                    {/* Area fill */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    {salesTrend.length > 1 && (
                      <path
                        d={`M ${salesTrend.map((item, idx) => {
                          const x = idx * (80 * salesTrend.length / salesTrend.length) + 40;
                          const rev = parseFloat(item.total_revenue || 0);
                          const y = 159 - (rev / maxSale) * 150;
                          return `${x},${y}`;
                        }).join(' L ')} L ${(salesTrend.length - 1) * 80 + 40},159 L 40,159 Z`}
                        fill="url(#chartGradient)"
                      />
                    )}

                    {/* Line */}
                    {salesTrend.length > 1 && (
                      <polyline
                        points={salesTrend.map((item, idx) => {
                          const x = idx * 80 + 40;
                          const rev = parseFloat(item.total_revenue || 0);
                          const y = 159 - (rev / maxSale) * 150;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points */}
                    {salesTrend.map((item, idx) => {
                      const x = idx * 80 + 40;
                      const rev = parseFloat(item.total_revenue || 0);
                      const y = 159 - (rev / maxSale) * 150;
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={y} r="4" fill="#2563eb" stroke="white" strokeWidth="2" />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* X-Axis labels */}
                <div className="flex justify-between mt-2 px-4">
                  {salesTrend.map((item, idx) => (
                    <span key={idx} className="text-[10px] text-slate-400 font-medium">
                      {item.sale_date
                        ? new Date(item.sale_date).toLocaleDateString('en-IN', { weekday: 'short' })
                        : monthNames[idx % 12]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: Product Management Table
          ═══════════════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-500" />
              <span>Product Management</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Wholesale catalog items with pricing & stock</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => navigate('/admin/products')}
          >
            ADD NEW PRODUCT
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Product Image</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Wholesale Price (₹)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                    <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    Products will appear from your wholesale catalog
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr
                    key={idx}
                    onClick={() => navigate('/admin/products')}
                    className="hover:bg-brand-50/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {p.product_name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">Category</td>
                    <td className="py-3 px-4 font-mono text-brand-600 dark:text-brand-400 text-[11px]">
                      {p.sku}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${
                        parseInt(p.total_quantity_sold || 0) < 10 ? 'text-rose-600' : 'text-slate-900 dark:text-white'
                      }`}>
                        {p.total_quantity_sold || '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      ₹{parseFloat(p.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button className="p-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-950/60 text-brand-600 dark:text-brand-400 transition-colors" title="Edit">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: Order & Billing + Quick Bill Generator + Broadcast
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order & Billing Table (2 Cols) */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-brand-500" />
                <span>Order & Billing</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Recent wholesale orders from retail partners</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate('/admin/orders')}
            >
              View All
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Shopper Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                      No wholesale orders found yet
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-brand-50/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => navigate('/admin/orders')}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {o.order_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{o.shop_name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(o.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={o.order_status} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button className="px-2 py-1 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 transition-colors">
                            Accept
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">/</span>
                          <button className="px-2 py-1 rounded text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 transition-colors">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Column: Quick Bill + Broadcast */}
        <div className="space-y-6">
          {/* Quick Bill Generator */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-brand-500" />
              <span>QUICK BILL GENERATOR</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Select Shopper
                </label>
                <select
                  value={billShopper}
                  onChange={(e) => setBillShopper(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                >
                  <option value="">Select Shopper...</option>
                  <option value="shree-krishna">Shree Krishna Traders</option>
                  <option value="mahadev">Mahadev Traders</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Add Product
                </label>
                <input
                  type="text"
                  placeholder="Add Product..."
                  value={billProduct}
                  onChange={(e) => setBillProduct(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={billQty}
                    onChange={(e) => setBillQty(parseInt(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Unit Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={billPrice}
                      onChange={(e) => setBillPrice(parseInt(e.target.value) || 0)}
                      className="w-full text-xs pl-6 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="gradient"
                size="md"
                icon={Printer}
                fullWidth
                onClick={() => navigate('/admin/billing')}
                className="mt-2"
              >
                GENERATE BILL & PRINT
              </Button>
            </div>
          </Card>

          {/* Send Broadcast Notification */}
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Megaphone className="w-4 h-4 text-brand-500" />
              <span>SEND BROADCAST NOTIFICATION</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                  Message
                </label>
                <textarea
                  rows={3}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Send your text /swr message"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none transition-all"
                />
              </div>

              <Button
                variant="gradient"
                size="md"
                icon={Send}
                fullWidth
                onClick={() => navigate('/admin/communication')}
              >
                SEND PUSH NOTIFICATION
              </Button>

              <p className="text-[10px] text-slate-400 text-center">
                Last notification sent: 2 hours ago
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: Critical Stock Replenishment Alert Bar
          ═══════════════════════════════════════════════════════════════ */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Warehouse Stock Replenishment Alert ({lowStockItems.length} Products Low)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lowStockItems.slice(0, 3).map((item) => `${item.product_name} (${item.available_stock} left)`).join(', ')}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/inventory')}
              className="border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex-shrink-0"
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
