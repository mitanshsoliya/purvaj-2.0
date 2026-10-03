import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CreditCard, Search, RefreshCw, Plus, Printer, CheckCircle2,
  AlertTriangle, DollarSign, Scale, Store, Calendar, ArrowRight,
  Download, Eye, Hash, Building2, User, Send, RotateCcw, ShieldCheck,
  Smartphone, Filter, XCircle, Info, Lock
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import { useToast } from '../../context/ToastContext';

export const AdminPayments = () => {
  const location = useLocation();
  const { addToast } = useToast();

  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [shops, setShops] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'transactions' | 'outstanding'

  // Record Offline Payment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordForm, setRecordForm] = useState({
    shop_id: '',
    amount: '',
    method: 'bank_transfer',
    transaction_reference: '',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Refund Modal
  const [selectedRefundItem, setSelectedRefundItem] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  // Receipt Modal
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Reminder state
  const [sendingReminderFor, setSendingReminderFor] = useState(null);

  // Sync tab with URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/payments/outstanding') || path.includes('/payments/credit')) {
      setActiveTab('outstanding');
    } else if (path.includes('/payments/transactions')) {
      setActiveTab('transactions');
    } else {
      setActiveTab('history');
    }
  }, [location.pathname]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, txnRes, shopRes, overviewRes] = await Promise.allSettled([
        api.get('/payments?limit=100'),
        api.get('/payments/transactions?limit=100'),
        api.get('/admin/shops?limit=100'),
        api.get('/payments/overview'),
      ]);

      if (payRes.status === 'fulfilled' && payRes.value.data?.data?.payments) {
        setPayments(payRes.value.data.data.payments);
      }
      if (txnRes.status === 'fulfilled' && txnRes.value.data?.data?.transactions) {
        setTransactions(txnRes.value.data.data.transactions);
      }
      if (shopRes.status === 'fulfilled' && shopRes.value.data?.data?.shops) {
        setShops(shopRes.value.data.data.shops);
      }
      if (overviewRes.status === 'fulfilled' && overviewRes.value.data?.data?.overview) {
        setOverview(overviewRes.value.data.data.overview);
      }
    } catch (err) {
      console.warn('Network error while loading payments:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenRecord = (preselectedShopId = '') => {
    setRecordForm({
      shop_id: preselectedShopId || (shops[0]?.id || ''),
      amount: '',
      method: 'bank_transfer',
      transaction_reference: '',
      payment_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setIsRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!recordForm.shop_id || !recordForm.amount) {
      addToast('Shop and Amount are required', 'error');
      return;
    }

    const amt = parseFloat(recordForm.amount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Enter a valid payment amount', 'error');
      return;
    }

    setRecording(true);
    try {
      const res = await api.post('/payments', recordForm);
      if (res.data?.success) {
        addToast('Offline wholesale payment recorded successfully!', 'success');
        setIsRecordModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
      addToast(err.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setRecording(false);
    }
  };

  const handleOpenRefund = (item) => {
    setSelectedRefundItem(item);
    setRefundAmount(item.amount?.toString() || '');
    setRefundReason('');
    setIsRefundModalOpen(true);
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRefundItem) return;
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      addToast('Enter a valid refund amount', 'error');
      return;
    }

    setRefunding(true);
    try {
      const res = await api.post(`/payments/${selectedRefundItem.id}/refund`, {
        amount: amt,
        reason: refundReason || 'Wholesale refund initiated by admin',
      });
      if (res.data?.success) {
        addToast('Refund processed and ledger updated', 'success');
        setIsRefundModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error('Refund failed:', err);
      addToast(err.response?.data?.message || 'Failed to process refund', 'error');
    } finally {
      setRefunding(false);
    }
  };

  const handleSendReminder = async (shop) => {
    setSendingReminderFor(shop.id);
    try {
      const res = await api.post(`/payments/reminder/${shop.id}`);
      if (res.data?.success) {
        addToast(`Payment reminder sent via WhatsApp & SMS to ${shop.shop_name}`, 'success');
      }
    } catch (err) {
      console.error('Reminder failed', err);
      addToast('Failed to dispatch payment reminder', 'error');
    } finally {
      setSendingReminderFor(null);
    }
  };

  // Metrics from overview endpoint or fallbacks
  const totalCollections = parseFloat(overview?.total_collected || payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0));
  const todayCollections = parseFloat(overview?.today_collected || 0);
  const totalOutstanding = parseFloat(overview?.total_outstanding || shops.reduce((sum, s) => sum + (parseFloat(s.credit_used) || 0), 0));
  const shopsWithDebt = shops.filter((s) => (parseFloat(s.credit_used) || 0) > 0);

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.shop_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.transaction_reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.payment_reference || '').toLowerCase().includes(search.toLowerCase());
    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;
    const matchesStatus = statusFilter === 'all' || (p.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesShop = shopFilter === 'all' || p.shop_id === shopFilter;
    return matchesSearch && matchesMethod && matchesStatus && matchesShop;
  });

  // Filtered Transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.transaction_ref || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.shop_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.gateway_order_id || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (t.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesMethod = methodFilter === 'all' || t.method === methodFilter;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Filtered Outstanding Shops
  const filteredOutstandingShops = shopsWithDebt.filter((s) => {
    return (
      (s.shop_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.owner_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.city || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Wholesale Payments & Credit Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Payment gateway verification, offline settlements, automated reminders, and retailer udhaar ledger
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenRecord()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Collections</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ₹{totalCollections.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Today: <strong>₹{todayCollections.toLocaleString('en-IN')}</strong>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">Total Udhaar / Credit</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
            ₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Pending collections across network</div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Retailers with Dues</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{shopsWithDebt.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active debtor accounts</div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Gateway Transactions</span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{transactions.length}</div>
          <div className="text-xs text-slate-500 mt-1">Audited gateway authorizations</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Payment Collections History ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'transactions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Gateway Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'outstanding'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            Outstanding Balances / Udhaar ({shopsWithDebt.length})
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Shop Name, UTR / Cheque Ref, or Txn ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Methods</option>
              <option value="online_gateway">Online Gateway</option>
              <option value="upi">UPI (Direct)</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="cash">Cash Desk</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed / Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </Card>

      {/* TAB 1: Payment Collections History */}
      {activeTab === 'history' && (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {loading ? (
            <div className="p-12">
              <LoadingState message="Loading payment transaction records..." />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={CreditCard}
                title="No payments recorded"
                description="Use '+ Record Payment' above to register a wholesale payment receipt."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="pb-3 px-4 font-semibold">Payment Ref</th>
                    <th className="pb-3 px-4 font-semibold">Date</th>
                    <th className="pb-3 px-4 font-semibold">Shop Name</th>
                    <th className="pb-3 px-4 font-semibold">Method & Txn Ref</th>
                    <th className="pb-3 px-4 font-semibold text-right">Amount</th>
                    <th className="pb-3 px-4 font-semibold">Status</th>
                    <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {p.payment_reference || p.id?.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {new Date(p.payment_date || p.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {p.shop_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase font-semibold text-slate-700 dark:text-slate-200">
                          {p.method?.replace('_', ' ')}
                        </span>
                        {p.transaction_reference && (
                          <span className="block text-[10px] font-mono text-slate-400">
                            {p.transaction_reference}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        ₹{parseFloat(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'refunded' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.status || 'PAID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => window.open(`/api/payments/${p.id}/print`, '_blank')}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600"
                            title="Print Receipt Voucher"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {p.status !== 'refunded' && (
                            <button
                              type="button"
                              onClick={() => handleOpenRefund(p)}
                              className="p-1 rounded text-slate-500 hover:text-rose-600"
                              title="Process Refund"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Gateway Transactions */}
      {activeTab === 'transactions' && (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-400" />
              <p className="font-bold">No Gateway Transactions</p>
              <p className="text-xs">Online gateway sessions and webhooks will appear here with cryptographic signatures.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="pb-3 px-4 font-semibold">Transaction Ref</th>
                    <th className="pb-3 px-4 font-semibold">Shop Name</th>
                    <th className="pb-3 px-4 font-semibold">Gateway / Order ID</th>
                    <th className="pb-3 px-4 font-semibold">Provider</th>
                    <th className="pb-3 px-4 font-semibold text-right">Amount</th>
                    <th className="pb-3 px-4 font-semibold">Status</th>
                    <th className="pb-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {t.transaction_ref}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {t.shop_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {t.gateway_order_id || 'SANDBOX'}
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-slate-600">
                        {t.gateway_provider}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                          t.status === 'FAILED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(t.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Outstanding Balances / Udhaar */}
      {activeTab === 'outstanding' && (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="pb-3 px-4 font-semibold">Retailer Shop</th>
                  <th className="pb-3 px-4 font-semibold">City & Contact</th>
                  <th className="pb-3 px-4 font-semibold text-right">Credit Limit</th>
                  <th className="pb-3 px-4 font-semibold text-right">Outstanding Udhaar</th>
                  <th className="pb-3 px-4 font-semibold text-right">Available Credit</th>
                  <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOutstandingShops.map((s) => {
                  const limit = parseFloat(s.credit_limit || 0);
                  const used = parseFloat(s.credit_used || 0);
                  const available = Math.max(0, limit - used);
                  const isExceeded = used >= limit;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {s.shop_name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {s.city} • {s.mobile}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        ₹{limit.toLocaleString('en-IN')}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${isExceeded ? 'text-rose-600' : 'text-amber-600'}`}>
                        ₹{used.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        ₹{available.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenRecord(s.id)}
                            className="text-[11px]"
                          >
                            Receive Cash
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={sendingReminderFor === s.id}
                            onClick={() => handleSendReminder(s)}
                            className="flex items-center gap-1 text-[11px] text-brand-600"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{sendingReminderFor === s.id ? 'Sending...' : 'Remind'}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* RECORD OFFLINE PAYMENT MODAL */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Wholesale Payment Receipt"
        size="md"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Select Retailer / Customer Shop
            </label>
            <select
              value={recordForm.shop_id}
              onChange={(e) => setRecordForm({ ...recordForm, shop_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shop_name} ({s.city}) — Udhaar Due: ₹{parseFloat(s.credit_used || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Amount Received (₹)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 50000"
                value={recordForm.amount}
                onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Settlement Channel
              </label>
              <select
                value={recordForm.method}
                onChange={(e) => setRecordForm({ ...recordForm, method: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="upi">Direct UPI Transfer</option>
                <option value="cash">Cash Received at Central Desk</option>
                <option value="cheque">Bank Cheque</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Bank UTR / Cheque Ref Number
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC-NEFT-991204"
                value={recordForm.transaction_reference}
                onChange={(e) => setRecordForm({ ...recordForm, transaction_reference: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Settlement Date
              </label>
              <input
                type="date"
                value={recordForm.payment_date}
                onChange={(e) => setRecordForm({ ...recordForm, payment_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Internal Settlement Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Settle against INV-20261002-12. Cleared with cashier."
              value={recordForm.notes}
              onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={recording}>
              {recording ? 'Recording...' : 'Credit Shop & Generate Voucher'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* REFUND MODAL */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Process Payment Refund"
        size="sm"
      >
        {selectedRefundItem && (
          <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
              <p className="font-bold">Refund Against {selectedRefundItem.payment_reference || selectedRefundItem.transaction_ref}</p>
              <p className="text-[11px] mt-0.5">Shop: {selectedRefundItem.shop_name} • Paid: ₹{parseFloat(selectedRefundItem.amount).toLocaleString('en-IN')}</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Refund Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                max={selectedRefundItem.amount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason for Refund
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Return of items or excess payment settlement"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsRefundModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit" disabled={refunding}>
                {refunding ? 'Processing...' : 'Authorize Refund'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminPayments;
