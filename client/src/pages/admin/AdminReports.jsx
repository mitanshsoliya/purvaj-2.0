import React, { useState, useEffect } from 'react';
import {
  BarChart3, Calendar, Download, Printer, RefreshCw, Filter,
  DollarSign, ShoppingCart, Store, Package, Warehouse,
  TrendingUp, ArrowUpRight, ArrowDownRight, Layers, Percent,
  CreditCard, Truck, AlertCircle, FileText, CheckCircle2, XCircle
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';

const REPORT_TABS = [
  { id: 'sales', label: '1. Sales Analytics' },
  { id: 'payments', label: '2. Payment Collections' },
  { id: 'outstanding', label: '3. Udhaar / Outstanding' },
  { id: 'products', label: '4. Product Sales & Velocity' },
  { id: 'inventory', label: '5. Central Warehouse Stock' },
  { id: 'shops', label: '6. Shop Performance' },
  { id: 'orders', label: '7. Order Lifecycle Pipeline' },
];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Previous Month' },
  { value: 'custom', label: 'Custom Date Range' },
];

export const AdminReports = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Report Specific States
  const [salesReport, setSalesReport] = useState({ summary: {}, breakdown: [] });
  const [paymentReport, setPaymentReport] = useState({ summary: {}, methodBreakdown: [], trend: [] });
  const [outstandingReport, setOutstandingReport] = useState({ summary: {}, shops: [] });
  const [productReport, setProductReport] = useState({ topProducts: [], slowMoving: [], categoryPerformance: [] });
  const [inventoryReport, setInventoryReport] = useState({ summary: {}, lowStockItems: [] });
  const [shopReport, setShopReport] = useState({ summary: {}, shops: [] });
  const [orderReport, setOrderReport] = useState({ summary: {}, trend: [] });

  useEffect(() => {
    fetchActiveReport();
  }, [activeTab, dateRange]);

  const fetchActiveReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date_range', dateRange);
      if (dateRange === 'custom') {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
      }

      if (activeTab === 'sales') {
        const res = await api.get(`/reports/sales?${params.toString()}`);
        if (res.data?.success && res.data?.data) setSalesReport(res.data.data);
      } else if (activeTab === 'payments') {
        const res = await api.get(`/reports/payments?${params.toString()}`);
        if (res.data?.success && res.data?.data) setPaymentReport(res.data.data);
      } else if (activeTab === 'outstanding') {
        const res = await api.get('/reports/outstanding');
        if (res.data?.success && res.data?.data) setOutstandingReport(res.data.data);
      } else if (activeTab === 'products') {
        const res = await api.get(`/reports/products?${params.toString()}`);
        if (res.data?.success && res.data?.data) setProductReport(res.data.data);
      } else if (activeTab === 'inventory') {
        const res = await api.get('/reports/inventory');
        if (res.data?.success && res.data?.data) setInventoryReport(res.data.data);
      } else if (activeTab === 'shops') {
        const res = await api.get(`/reports/shops?${params.toString()}`);
        if (res.data?.success && res.data?.data) setShopReport(res.data.data);
      } else if (activeTab === 'orders') {
        const res = await api.get(`/reports/orders?${params.toString()}`);
        if (res.data?.success && res.data?.data) setOrderReport(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      addToast('Failed to load report data from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    params.append('type', activeTab);
    params.append('date_range', dateRange);
    if (dateRange === 'custom') {
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
    }
    const token = localStorage.getItem('purvaj_auth_token') || localStorage.getItem('token');
    window.open(`/api/reports/export?${params.toString()}&token=${encodeURIComponent(token || '')}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            Advanced Business Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Server-side financial truth, sales auditing, credit utilization, and stock valuation
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActiveReport}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range & Preset Filtering Bar */}
      <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] shrink-0">
              Period Preset:
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <Button variant="secondary" size="sm" onClick={fetchActiveReport}>
                Filter
              </Button>
            </div>
          )}

          <div className="text-[11px] text-slate-400">
            * All financial totals calculated directly from verified database ledgers.
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-1.5">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT CONTENT BODY */}
      {loading ? (
        <Card className="p-12">
          <LoadingState message="Compiling verified report data..." />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 1. SALES REPORT */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Gross Sales</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                    ₹{parseFloat(salesReport.summary?.gross_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">{salesReport.summary?.total_orders || 0} Total Orders</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Net Delivered Sales</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">
                    ₹{parseFloat(salesReport.summary?.net_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">Delivered & Realized</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Average Order Value (AOV)</span>
                  <span className="text-xl font-bold text-blue-600 mt-1 block">
                    ₹{parseFloat(salesReport.summary?.average_order_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">Per wholesale transaction</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">Cancelled Orders</span>
                  <span className="text-xl font-bold text-rose-600 mt-1 block">
                    {salesReport.summary?.cancelled_orders || 0}
                  </span>
                  <span className="text-[11px] text-rose-500">₹{parseFloat(salesReport.summary?.cancelled_amount || 0).toLocaleString('en-IN')}</span>
                </Card>
              </div>

              <Card title="Sales Daily Volume Breakdown">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="pb-2.5 font-semibold">Date</th>
                        <th className="pb-2.5 font-semibold text-right">Orders Placed</th>
                        <th className="pb-2.5 font-semibold text-right">Gross Volume</th>
                        <th className="pb-2.5 font-semibold text-right">Delivered Volume</th>
                        <th className="pb-2.5 font-semibold text-right">Cancelled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(salesReport.breakdown || []).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-medium text-slate-900 dark:text-white">
                            {new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{row.orders_count}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">
                            ₹{parseFloat(row.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-emerald-600">
                            ₹{parseFloat(row.delivered_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 text-right text-rose-500 font-semibold">{row.cancelled_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 2. PAYMENT REPORT */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Total Collections</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">
                    ₹{parseFloat(paymentReport.summary?.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">{paymentReport.summary?.total_transactions || 0} Transactions</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider block">Online Gateway</span>
                  <span className="text-xl font-bold text-brand-600 mt-1 block">
                    ₹{parseFloat(paymentReport.summary?.online_payments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">Cards, UPI & NetBanking</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Bank Transfers / NEFT</span>
                  <span className="text-xl font-bold text-blue-600 mt-1 block">
                    ₹{parseFloat(paymentReport.summary?.bank_upi_payments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">Direct warehouse account credit</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Cash at Desk</span>
                  <span className="text-xl font-bold text-amber-600 mt-1 block">
                    ₹{parseFloat(paymentReport.summary?.cash_payments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">Physical receipt vouchers</span>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card title="Settlement Breakdown by Channel">
                  <div className="space-y-3">
                    {(paymentReport.methodBreakdown || []).map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white uppercase">{m.method?.replace('_', ' ')}</span>
                          <span className="text-slate-400 block text-[11px]">{m.count} payments</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">
                          ₹{parseFloat(m.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Daily Collection Timeline">
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(paymentReport.trend || []).map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-slate-600 dark:text-slate-300">
                          {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="font-bold text-emerald-600">
                          ₹{parseFloat(t.collected_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 3. OUTSTANDING REPORT */}
          {activeTab === 'outstanding' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider block">Total Outstanding Udhaar</span>
                  <span className="text-xl font-bold text-purple-600 mt-1 block">
                    ₹{parseFloat(outstandingReport.summary?.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">Total receivables across network</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Credit Limit</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                    ₹{parseFloat(outstandingReport.summary?.total_credit_limit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">{outstandingReport.summary?.total_shops || 0} Registered Shops</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Available Network Credit</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">
                    ₹{parseFloat(outstandingReport.summary?.available_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">Remaining limit for new orders</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Credit Utilization</span>
                  <span className="text-xl font-bold text-amber-600 mt-1 block">
                    {outstandingReport.summary?.avg_utilization_pct || 0}%
                  </span>
                  <span className="text-[11px] text-slate-400">{outstandingReport.summary?.shops_with_dues || 0} Shops with active dues</span>
                </Card>
              </div>

              <Card title="Shop-Wise Outstanding Ledger Balance">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="pb-2.5 font-semibold">Shop Name</th>
                        <th className="pb-2.5 font-semibold">City & Contact</th>
                        <th className="pb-2.5 font-semibold text-right">Credit Limit</th>
                        <th className="pb-2.5 font-semibold text-right">Current Udhaar</th>
                        <th className="pb-2.5 font-semibold text-right">Utilization</th>
                        <th className="pb-2.5 font-semibold text-right">Available</th>
                        <th className="pb-2.5 font-semibold">Last Paid Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(outstandingReport.shops || []).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-bold text-slate-900 dark:text-white">{s.shop_name}</td>
                          <td className="py-2.5 text-slate-500">{s.city} • {s.mobile}</td>
                          <td className="py-2.5 text-right font-medium text-slate-700 dark:text-slate-300">
                            ₹{parseFloat(s.credit_limit).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 text-right font-bold text-purple-600">
                            ₹{parseFloat(s.outstanding_balance).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-amber-600">
                            {s.utilization_pct}%
                          </td>
                          <td className="py-2.5 text-right font-bold text-emerald-600">
                            ₹{parseFloat(s.available_credit).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 text-slate-500">
                            {s.last_payment_date ? new Date(s.last_payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 4. PRODUCT REPORT */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card title="Top-Selling Wholesale Products">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(productReport.topProducts || []).map((p, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{p.product_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            SKU: {p.sku} • Category: {p.category_name || 'General'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-600 dark:text-brand-400">
                            ₹{parseFloat(p.total_revenue).toLocaleString('en-IN')}
                          </p>
                          <span className="text-[11px] text-slate-500 font-semibold">{p.total_units_sold} units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Slow-Moving / Low Stock Velocity">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(productReport.slowMoving || []).map((p, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{p.product_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">SKU: {p.sku}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {p.current_stock} Units in Hub
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{p.units_sold} sold in period</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card title="Category Revenue Performance">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="pb-2.5 font-semibold">Category Name</th>
                        <th className="pb-2.5 font-semibold text-right">Products Count</th>
                        <th className="pb-2.5 font-semibold text-right">Units Ordered</th>
                        <th className="pb-2.5 font-semibold text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(productReport.categoryPerformance || []).map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-bold text-slate-900 dark:text-white">{c.category_name}</td>
                          <td className="py-2.5 text-right font-medium text-slate-700 dark:text-slate-300">{c.product_count}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">{c.units_sold}</td>
                          <td className="py-2.5 text-right font-bold text-brand-600">
                            ₹{parseFloat(c.category_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 5. INVENTORY REPORT */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Central Stock Value (Selling)</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                    ₹{parseFloat(inventoryReport.summary?.total_retail_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">{inventoryReport.summary?.total_stock_units || 0} Total Units</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Stock Valuation (Cost)</span>
                  <span className="text-xl font-bold text-blue-600 mt-1 block">
                    ₹{parseFloat(inventoryReport.summary?.total_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[11px] text-slate-400">Central purchase investment</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Low Stock Alerts</span>
                  <span className="text-xl font-bold text-amber-600 mt-1 block">
                    {inventoryReport.summary?.low_stock_count || 0}
                  </span>
                  <span className="text-[11px] text-amber-600">Reorder threshold breached</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">Out of Stock Items</span>
                  <span className="text-xl font-bold text-rose-600 mt-1 block">
                    {inventoryReport.summary?.out_of_stock_count || 0}
                  </span>
                  <span className="text-[11px] text-rose-500">Requires PO generation</span>
                </Card>
              </div>

              <Card title="Low Stock Central Hub Manifest">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="pb-2.5 font-semibold">SKU</th>
                        <th className="pb-2.5 font-semibold">Product Name</th>
                        <th className="pb-2.5 font-semibold">Category</th>
                        <th className="pb-2.5 font-semibold text-right">Available Stock</th>
                        <th className="pb-2.5 font-semibold text-right">Min Threshold</th>
                        <th className="pb-2.5 font-semibold text-right">Unit Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(inventoryReport.lowStockItems || []).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-mono font-bold text-brand-600">{item.sku}</td>
                          <td className="py-2.5 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="py-2.5 text-slate-500">{item.category_name}</td>
                          <td className="py-2.5 text-right font-bold text-rose-600">{item.current_stock}</td>
                          <td className="py-2.5 text-right text-slate-500">{item.minimum_stock}</td>
                          <td className="py-2.5 text-right font-medium">₹{parseFloat(item.purchase_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 6. SHOP REPORT */}
          {activeTab === 'shops' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Retailers</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                    {shopReport.summary?.active_shops || 0}
                  </span>
                  <span className="text-[11px] text-slate-400">Of {shopReport.summary?.total_shops || 0} Total Network Shops</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider block">New Shops in Period</span>
                  <span className="text-xl font-bold text-brand-600 mt-1 block">
                    {shopReport.summary?.new_shops_in_period || 0}
                  </span>
                  <span className="text-[11px] text-brand-500">Onboarded during filter range</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Active Order Network</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">
                    {(shopReport.shops || []).length}
                  </span>
                  <span className="text-[11px] text-slate-400">Stores ordering in this window</span>
                </Card>
              </div>

              <Card title="Retailer Order & Revenue Performance">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="pb-2.5 font-semibold">Shop Name</th>
                        <th className="pb-2.5 font-semibold">City & Contact</th>
                        <th className="pb-2.5 font-semibold text-right">Orders</th>
                        <th className="pb-2.5 font-semibold text-right">Revenue (₹)</th>
                        <th className="pb-2.5 font-semibold text-right">Collections Realized</th>
                        <th className="pb-2.5 font-semibold text-right">Current Udhaar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(shopReport.shops || []).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-bold text-slate-900 dark:text-white">{s.shop_name}</td>
                          <td className="py-2.5 text-slate-500">{s.city} • {s.mobile}</td>
                          <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">{s.period_orders}</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">
                            ₹{parseFloat(s.period_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 text-right font-bold text-emerald-600">
                            ₹{parseFloat(s.period_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 text-right font-bold text-purple-600">
                            ₹{parseFloat(s.outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 7. ORDER REPORT */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Pipeline Orders</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                    {orderReport.summary?.total_orders || 0}
                  </span>
                  <span className="text-[11px] text-slate-400">₹{parseFloat(orderReport.summary?.total_value || 0).toLocaleString('en-IN')} Total Value</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Pending & Processing</span>
                  <span className="text-xl font-bold text-amber-600 mt-1 block">
                    {(orderReport.summary?.pending || 0) + (orderReport.summary?.confirmed || 0) + (orderReport.summary?.processing || 0)}
                  </span>
                  <span className="text-[11px] text-slate-400">In central warehouse fulfillment</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wider block">Out for Delivery</span>
                  <span className="text-xl font-bold text-brand-600 mt-1 block">
                    {orderReport.summary?.out_for_delivery || 0}
                  </span>
                  <span className="text-[11px] text-brand-500">In transit vehicles</span>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Delivered Orders</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">
                    {orderReport.summary?.delivered || 0}
                  </span>
                  <span className="text-[11px] text-emerald-600">Successfully handed over</span>
                </Card>
              </div>

              <Card title="Fulfillment Lifecycle Pipeline Distribution">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending</span>
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-1 block">{orderReport.summary?.pending || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40">
                    <span className="text-[10px] text-blue-500 uppercase font-bold block">Confirmed</span>
                    <span className="text-lg font-bold text-blue-600 mt-1 block">{orderReport.summary?.confirmed || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40">
                    <span className="text-[10px] text-amber-500 uppercase font-bold block">Processing</span>
                    <span className="text-lg font-bold text-amber-600 mt-1 block">{orderReport.summary?.processing || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40">
                    <span className="text-[10px] text-cyan-500 uppercase font-bold block">Packed</span>
                    <span className="text-lg font-bold text-cyan-600 mt-1 block">{orderReport.summary?.packed || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/40">
                    <span className="text-[10px] text-brand-500 uppercase font-bold block">Dispatched</span>
                    <span className="text-lg font-bold text-brand-600 mt-1 block">{orderReport.summary?.out_for_delivery || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-[10px] text-emerald-500 uppercase font-bold block">Delivered</span>
                    <span className="text-lg font-bold text-emerald-600 mt-1 block">{orderReport.summary?.delivered || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40">
                    <span className="text-[10px] text-rose-500 uppercase font-bold block">Cancelled</span>
                    <span className="text-lg font-bold text-rose-600 mt-1 block">{orderReport.summary?.cancelled || 0}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40">
                    <span className="text-[10px] text-purple-500 uppercase font-bold block">Returned</span>
                    <span className="text-lg font-bold text-purple-600 mt-1 block">{orderReport.summary?.returned || 0}</span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
