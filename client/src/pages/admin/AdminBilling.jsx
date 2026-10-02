import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, RefreshCw, Printer, Download,
  CheckCircle2, Clock, AlertTriangle, Building, CreditCard,
  Eye, Calendar, ArrowRight, UserCheck, Receipt, DollarSign,
  Trash2, X, ShieldCheck
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

export const AdminBilling = () => {
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Invoice Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState('order'); // 'order' | 'manual'
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [manualDiscount, setManualDiscount] = useState('0');
  const [manualItems, setManualItems] = useState([
    { item_name: '', sku: '', hsn_code: '1905', quantity: '1', unit: 'Carton', rate: '', tax_rate: '18', discount: '0' }
  ]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Invoice Detail / Print Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Receipt Modal State
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const [invRes, ordRes, shopRes] = await Promise.allSettled([
        api.get('/billing/invoices?limit=100'),
        api.get('/orders?limit=100'),
        api.get('/admin/shops?limit=100'),
      ]);

      if (invRes.status === 'fulfilled' && invRes.value.data?.data?.invoices) {
        setInvoices(invRes.value.data.data.invoices);
      }
      if (ordRes.status === 'fulfilled' && ordRes.value.data?.data?.orders) {
        setOrders(ordRes.value.data.data.orders);
      }
      if (shopRes.status === 'fulfilled' && shopRes.value.data?.data?.shops) {
        setShops(shopRes.value.data.data.shops);
      }
    } catch (err) {
      console.error('Failed to load billing records', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateError('');
    setSelectedOrderId('');
    setSelectedShopId('');
    setCreationMode('order');
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));
    setNotes('');
    setManualDiscount('0');
    setManualItems([
      { item_name: 'FMCG Wholesale Consignment', sku: 'FMCG-PKG', hsn_code: '1905', quantity: '10', unit: 'Carton', rate: '500', tax_rate: '18', discount: '0' }
    ]);
    setIsCreateModalOpen(true);
  };

  const handleAddManualItem = () => {
    setManualItems((prev) => [
      ...prev,
      { item_name: '', sku: '', hsn_code: '1905', quantity: '1', unit: 'Carton', rate: '', tax_rate: '18', discount: '0' }
    ]);
  };

  const handleRemoveManualItem = (index) => {
    setManualItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateManualItem = (index, field, value) => {
    setManualItems((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      let payload;
      if (creationMode === 'order') {
        if (!selectedOrderId) {
          throw new Error('Please select an order to bill');
        }
        payload = {
          order_id: selectedOrderId,
          due_date: dueDate || undefined,
          notes: notes || undefined,
        };
      } else {
        if (!selectedShopId) {
          throw new Error('Please select a retailer for this direct invoice');
        }
        if (manualItems.length === 0 || !manualItems[0].item_name || !manualItems[0].rate) {
          throw new Error('Please provide at least one valid line item with name and rate');
        }
        payload = {
          shop_id: selectedShopId,
          items: manualItems.map((item) => ({
            item_name: item.item_name,
            sku: item.sku || 'FMCG',
            hsn_code: item.hsn_code || '1905',
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'pcs',
            rate: parseFloat(item.rate) || 0,
            discount: parseFloat(item.discount) || 0,
            tax_rate: parseFloat(item.tax_rate) || 18,
          })),
          discount: parseFloat(manualDiscount) || 0,
          due_date: dueDate || undefined,
          notes: notes || undefined,
        };
      }

      const res = await api.post('/billing/invoices', payload);
      if (res.data?.success) {
        setIsCreateModalOpen(false);
        fetchInvoices();
      } else {
        throw new Error(res.data?.message || 'Invoice creation failed');
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenDetail = async (invoiceId) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    setPrintFormat('a4');
    try {
      const res = await api.get(`/billing/invoices/${invoiceId}`);
      if (res.data?.success && res.data?.data?.invoice) {
        setSelectedInvoice(res.data.data.invoice);
      }
    } catch (err) {
      console.error('Failed to load invoice details', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenPayment = (inv) => {
    setSelectedInvoice(inv);
    setPaymentAmount(parseFloat(inv.outstanding || inv.total).toFixed(2));
    setPaymentMethod('bank_transfer');
    setPaymentReference('');
    setPaymentError('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentError('');
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Enter a valid payment amount');
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await api.post('/payments', {
        shop_id: selectedInvoice.shop_id,
        invoice_id: selectedInvoice.id,
        order_id: selectedInvoice.order_id || undefined,
        amount: amt,
        method: paymentMethod,
        transaction_reference: paymentReference || `BILL-PYMT-${Date.now().toString().slice(-6)}`,
      });

      if (res.data?.success) {
        setIsPaymentModalOpen(false);
        fetchInvoices();
        // Automatically fetch and show payment receipt
        const paymentId = res.data.data?.payment?.id;
        if (paymentId) {
          handleViewReceipt(paymentId);
        }
      }
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt`);
      if (res.data?.success && res.data?.data?.receipt) {
        setPaymentReceipt(res.data.data.receipt);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load payment receipt', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter & Search
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.order_number?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      inv.status === statusFilter ||
      (statusFilter === 'unpaid' && (inv.status === 'issued' || inv.status === 'overdue'));

    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalBilled = invoices.reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const pendingCount = invoices.filter((i) => i.status === 'issued' || i.status === 'partially_paid').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Billing & Invoicing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Authoritative B2B GST tax invoices, thermal POS receipts, payment reconciliation, and ledger debit tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchInvoices}
            isLoading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenCreate}
            className="shadow-soft font-semibold"
          >
            Create Tax Invoice
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Invoices</span>
            <FileText className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{invoices.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Authoritative records</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Billed Turnover</span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            ₹{totalBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Including CGST/SGST/IGST</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Fully Paid</span>
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{paidCount}</div>
          <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-0.5">Invoices settled in full</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Pending Collection</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{pendingCount}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Outstanding on wholesale credit</div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice #, Retailer Name, Order #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Invoice Statuses</option>
              <option value="issued">Issued / Unpaid</option>
              <option value="paid">Fully Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Invoices List Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <LoadingState message="Loading tax invoices from database..." />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={FileText}
              title="No Invoices Found"
              description="No tax invoices match your filter criteria. Click 'Create Tax Invoice' to generate one."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Retailer</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Taxable</th>
                  <th className="py-3 px-4 text-right">Tax</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map((inv) => {
                  const total = parseFloat(inv.total || 0);
                  const tax = parseFloat(inv.tax || 0);
                  const subtotal = parseFloat(inv.subtotal || total - tax);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{inv.shop_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {inv.shop_gstin || 'GST Pending'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {inv.order_number ? `#${inv.order_number}` : 'Direct Bill'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(inv.invoice_date || inv.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600 dark:text-slate-300">
                        ₹{subtotal.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-500">
                        ₹{tax.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(inv)}
                              title="Record Payment"
                              className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
                            >
                              Collect
                            </button>
                          )}
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={Eye}
                            onClick={() => handleOpenDetail(inv.id)}
                            className="font-medium"
                          >
                            Print/View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE INVOICE MODAL (Supports Order Generation & Direct Line Items) */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create B2B GST Tax Invoice"
        subtitle="Authoritative server calculations with intra-state / inter-state tax split"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* Creation Mode Switcher */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setCreationMode('order')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                creationMode === 'order'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Generate From Wholesale Order
            </button>
            <button
              type="button"
              onClick={() => setCreationMode('manual')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-colors ${
                creationMode === 'manual'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Direct B2B Invoice (Manual Items)
            </button>
          </div>

          {creationMode === 'order' ? (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Select Confirmed / Pending Wholesale Order *
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Order to Bill --</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.order_number} — {o.shop_name} (₹{parseFloat(o.total || o.total_amount).toFixed(2)}) — Status: {o.order_status}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Select Retail Store / Customer *
                </label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Retailer --</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shop_name} (GSTIN: {s.gstin || 'None'}, {s.city || 'Gujarat'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Invoice Line Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManualItem}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {manualItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input
                          type="text"
                          placeholder="Item Description"
                          value={item.item_name}
                          onChange={(e) => handleUpdateManualItem(idx, 'item_name', e.target.value)}
                          required
                          className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="HSN"
                          value={item.hsn_code}
                          onChange={(e) => handleUpdateManualItem(idx, 'hsn_code', e.target.value)}
                          className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleUpdateManualItem(idx, 'quantity', e.target.value)}
                          required
                          className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Rate ₹"
                          value={item.rate}
                          onChange={(e) => handleUpdateManualItem(idx, 'rate', e.target.value)}
                          required
                          className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right"
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          value={item.tax_rate}
                          onChange={(e) => handleUpdateManualItem(idx, 'tax_rate', e.target.value)}
                          className="w-full px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          disabled={manualItems.length === 1}
                          onClick={() => handleRemoveManualItem(idx)}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Overall Invoice Discount (₹)
                </label>
                <input
                  type="number"
                  value={manualDiscount}
                  onChange={(e) => setManualDiscount(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Notes / Gate Remarks
              </label>
              <input
                type="text"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={creating} className="font-bold">
              {creating ? 'Generating Invoice...' : 'Generate Tax Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* OFFICIAL GST TAX INVOICE & THERMAL RECEIPT PRINT PREVIEW MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedInvoice ? `Invoice #${selectedInvoice.invoice_number}` : 'Tax Invoice'}
        subtitle="Print-ready B2B Wholesale Format & POS Thermal Receipt"
        maxWidth="max-w-4xl"
      >
        {loadingDetail || !selectedInvoice ? (
          <div className="p-12 text-center">
            <LoadingState message="Loading invoice from database..." />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Format Toggle Bar */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl no-print">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPrintFormat('a4')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    printFormat === 'a4'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Standard A4 Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('thermal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    printFormat === 'thermal'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  80mm POS Thermal Slip
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" icon={Printer} onClick={handlePrint}>
                  Print / Save PDF
                </Button>
              </div>
            </div>

            {/* A4 FORMAT PRINTABLE SHEET */}
            {printFormat === 'a4' ? (
              <div
                id="printable-tax-invoice"
                className="printable-area bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 font-sans text-xs space-y-4"
              >
                {/* Header Banner */}
                <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                      PURVAJ WHOLESALE DISTRIBUTORS
                    </h2>
                    <p className="text-[11px] text-slate-600 mt-0.5">Central Warehouse Node: PURVAJ_CENTRAL_01</p>
                    <p className="text-[11px] text-slate-600">Plot 45, GIDC Industrial Estate, Naroda, Ahmedabad, Gujarat - 382445</p>
                    <p className="text-[11px] font-mono font-semibold text-slate-800">
                      GSTIN: 24AAACP9999P1Z5 • FSSAI: 10722000000123
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-bold tracking-wider text-xs uppercase mb-1">
                      TAX INVOICE
                    </span>
                    <p className="font-mono text-sm font-bold text-slate-900">{selectedInvoice.invoice_number}</p>
                    <p className="text-[11px] text-slate-600">
                      Date: {new Date(selectedInvoice.invoice_date || selectedInvoice.created_at).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-[11px] text-rose-600 font-semibold">
                      Due: {new Date(selectedInvoice.due_date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Buyer & Seller Info Two Columns */}
                <div className="grid grid-cols-2 gap-6 py-2 border-b border-slate-200">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Billed To (Retail Customer / Consignee)
                    </span>
                    <p className="font-bold text-sm text-slate-900 mt-0.5">{selectedInvoice.shop_name}</p>
                    <p className="text-slate-600">{selectedInvoice.owner_name}</p>
                    <p className="text-slate-600">{selectedInvoice.shop_address || 'Storefront Address'}</p>
                    <p className="text-slate-600">{selectedInvoice.shop_city || 'Ahmedabad'}, Gujarat</p>
                    <p className="font-semibold text-slate-800 mt-1 font-mono">
                      GSTIN: {selectedInvoice.shop_gstin || 'Unregistered'}
                    </p>
                  </div>

                  <div className="text-right space-y-1 text-[11px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Dispatch & Tax Details
                    </span>
                    <p><span className="text-slate-500">Order Ref:</span> <span className="font-mono font-bold">#{selectedInvoice.order_number || 'Direct'}</span></p>
                    <p><span className="text-slate-500">Place of Supply:</span> <span className="font-semibold">{selectedInvoice.is_interstate ? 'Inter-State' : 'Gujarat (24)'}</span></p>
                    <p><span className="text-slate-500">Invoice Status:</span> <span className="font-bold uppercase text-emerald-700">{selectedInvoice.status}</span></p>
                    <p><span className="text-slate-500">Outstanding on Bill:</span> <span className="font-bold text-rose-600">₹{parseFloat(selectedInvoice.outstanding ?? selectedInvoice.total).toFixed(2)}</span></p>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                      <th className="p-2 border-r border-slate-300 w-8">#</th>
                      <th className="p-2 border-r border-slate-300">Description of Goods</th>
                      <th className="p-2 border-r border-slate-300 text-center w-16">HSN</th>
                      <th className="p-2 border-r border-slate-300 text-center w-14">Qty</th>
                      <th className="p-2 border-r border-slate-300 text-right w-20">Rate (₹)</th>
                      <th className="p-2 border-r border-slate-300 text-right w-14">GST %</th>
                      <th className="p-2 text-right w-24">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(selectedInvoice.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 text-slate-400">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">
                          <div>{item.item_name || item.name || item.product_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono">{item.hsn_code || '1905'}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold">{item.quantity}</td>
                        <td className="p-2 border-r border-slate-200 text-right">₹{parseFloat(item.rate || item.unit_price).toFixed(2)}</td>
                        <td className="p-2 border-r border-slate-200 text-right">{item.tax_rate || 18}%</td>
                        <td className="p-2 text-right font-bold">₹{parseFloat(item.total_amount || item.total || (item.quantity * item.rate)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Financial Summary & Bank Details */}
                <div className="border-t border-slate-300 pt-3 grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Bank Settlement Details
                    </span>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono leading-relaxed text-slate-700">
                      <div>Bank: HDFC Bank Ltd.</div>
                      <div>A/C: 50200012345678</div>
                      <div>IFSC: HDFC0001234</div>
                      <div>UPI: purvaj.wholesale@hdfcbank</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-right text-xs">
                    <div className="flex justify-between py-0.5 text-slate-600">
                      <span>Taxable Value:</span>
                      <span className="font-semibold">₹{parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                    </div>

                    {selectedInvoice.is_interstate ? (
                      <div className="flex justify-between py-0.5 text-slate-600">
                        <span>IGST:</span>
                        <span className="font-semibold">₹{parseFloat(selectedInvoice.igst || selectedInvoice.tax).toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between py-0.5 text-slate-600">
                          <span>CGST (9.0%):</span>
                          <span className="font-semibold">₹{parseFloat(selectedInvoice.cgst || selectedInvoice.tax / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-0.5 text-slate-600">
                          <span>SGST (9.0%):</span>
                          <span className="font-semibold">₹{parseFloat(selectedInvoice.sgst || selectedInvoice.tax / 2).toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    {parseFloat(selectedInvoice.discount || 0) > 0 && (
                      <div className="flex justify-between py-0.5 text-emerald-600">
                        <span>Wholesale Trade Discount:</span>
                        <span>-₹{parseFloat(selectedInvoice.discount).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
                      <span>Invoice Grand Total:</span>
                      <span className="text-brand-600">₹{parseFloat(selectedInvoice.total).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>Amount Paid:</span>
                      <span className="text-emerald-600 font-bold">₹{parseFloat(selectedInvoice.amount_paid || 0).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold text-rose-600">
                      <span>Balance Outstanding:</span>
                      <span>₹{parseFloat(selectedInvoice.outstanding ?? selectedInvoice.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Signatory & Legal Terms */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                  <div className="max-w-md">
                    <p className="font-bold text-slate-700">Terms & Conditions:</p>
                    <p>1. Payment due within {selectedInvoice.payment_terms || 15} days from invoice date.</p>
                    <p>2. Subject to Ahmedabad jurisdiction only.</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800 text-[11px] mb-6">For, PURVAJ WHOLESALE DISTRIBUTORS</p>
                    <p className="border-t border-slate-400 pt-1 font-semibold">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            ) : (
              /* THERMAL 80MM RECEIPT SLIP */
              <div
                id="printable-thermal-invoice"
                className="printable-area thermal-receipt-mode mx-auto bg-white text-slate-950 p-4 border border-slate-300 font-mono text-[10px] space-y-2 shadow-sm"
              >
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <p className="font-bold text-xs uppercase">PURVAJ WHOLESALE</p>
                  <p className="text-[9px]">AHMEDABAD, GUJARAT</p>
                  <p className="text-[9px]">GSTIN: 24AAACP9999P1Z5</p>
                  <p className="font-bold mt-1 text-[11px]">TAX INVOICE</p>
                  <p className="font-bold">{selectedInvoice.invoice_number}</p>
                  <p className="text-[9px]">{new Date(selectedInvoice.invoice_date || Date.now()).toLocaleString('en-IN')}</p>
                </div>

                <div className="border-b border-dashed border-slate-400 pb-2">
                  <p className="font-bold">SHOP: {selectedInvoice.shop_name}</p>
                  <p>GSTIN: {selectedInvoice.shop_gstin || 'None'}</p>
                  <p>ORDER: #{selectedInvoice.order_number || 'Direct'}</p>
                </div>

                <div className="divide-y divide-dashed divide-slate-300 py-1">
                  {(selectedInvoice.items || []).map((item, idx) => (
                    <div key={idx} className="py-1">
                      <p className="font-bold truncate">{item.item_name || item.name}</p>
                      <div className="flex justify-between">
                        <span>{item.quantity} x ₹{parseFloat(item.rate || item.unit_price).toFixed(2)}</span>
                        <span className="font-bold">₹{parseFloat(item.total_amount || (item.quantity * item.rate)).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-400 pt-2 space-y-0.5 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total GST:</span>
                    <span>₹{parseFloat(selectedInvoice.tax).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-400">
                    <span>GRAND TOTAL:</span>
                    <span>₹{parseFloat(selectedInvoice.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Paid:</span>
                    <span>₹{parseFloat(selectedInvoice.amount_paid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Outstanding:</span>
                    <span>₹{parseFloat(selectedInvoice.outstanding ?? selectedInvoice.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[9px] text-slate-600">
                  <p>THANK YOU FOR YOUR WHOLESALE BUSINESS!</p>
                  <p>HELPLINE: +91 97240 06035</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* RECORD FULL / PARTIAL PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${selectedInvoice?.invoice_number}`}
        subtitle={`Retailer: ${selectedInvoice?.shop_name} • Total Bill: ₹${parseFloat(selectedInvoice?.total || 0).toFixed(2)}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          {paymentError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {paymentError}
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>Total Invoice Amount:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                ₹{parseFloat(selectedInvoice?.total || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Current Outstanding:</span>
              <span className="font-bold text-rose-600">
                ₹{parseFloat(selectedInvoice?.outstanding ?? selectedInvoice?.total ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">
              Payment Amount Received (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
              <option value="cash">Cash Settlement</option>
              <option value="upi">UPI / QR Payment</option>
              <option value="cheque">Bank Cheque</option>
            </select>
          </div>

          <div>
            <label className="block font-bold uppercase mb-1">
              Bank / UPI / Cheque Reference Number
            </label>
            <input
              type="text"
              placeholder="e.g. UTR49281928 or CHQ-9912"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={recordingPayment} className="font-bold">
              {recordingPayment ? 'Recording...' : 'Confirm Payment & Restore Credit'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* OFFICIAL PAYMENT RECEIPT MODAL */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Official Payment Receipt Voucher"
        subtitle="Print-ready settlement acknowledgment"
        maxWidth="max-w-md"
      >
        {paymentReceipt && (
          <div className="space-y-4">
            <div
              id="printable-payment-receipt"
              className="printable-area p-5 bg-white text-slate-900 rounded-xl border border-slate-300 font-sans text-xs space-y-3"
            >
              <div className="text-center border-b border-slate-300 pb-3">
                <h3 className="font-bold text-sm tracking-tight text-slate-900 uppercase">
                  PURVAJ WHOLESALE DISTRIBUTORS
                </h3>
                <p className="text-[10px] text-slate-600">Central Distribution Hub • GSTIN: 24AAACP9999P1Z5</p>
                <div className="inline-block mt-2 px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                  OFFICIAL PAYMENT RECEIPT
                </div>
                <p className="font-mono font-bold text-slate-900 mt-1">{paymentReceipt.receipt_number}</p>
                <p className="text-[10px] text-slate-500">
                  Date: {new Date(paymentReceipt.payment_date || paymentReceipt.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>

              <div className="space-y-1.5 border-b border-slate-200 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Received From:</span>
                  <span className="font-bold text-slate-900">{paymentReceipt.shop_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GSTIN:</span>
                  <span className="font-mono">{paymentReceipt.shop_gstin || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="capitalize font-semibold">{paymentReceipt.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference / UTR:</span>
                  <span className="font-mono">{paymentReceipt.transaction_reference || 'N/A'}</span>
                </div>
                {paymentReceipt.invoice_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Against Invoice:</span>
                    <span className="font-mono font-bold text-brand-600">#{paymentReceipt.invoice_number}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600 font-semibold">Amount Received:</span>
                  <span className="text-lg font-bold text-emerald-700">₹{paymentReceipt.amount_formatted}</span>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  ({paymentReceipt.amount_words})
                </p>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-slate-500">Remaining Udhaar Balance:</span>
                <span className="font-bold text-rose-600">₹{paymentReceipt.remaining_outstanding}</span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                <div>
                  <p>Received By: {paymentReceipt.received_by_name || 'Accounts Desk'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">For, PURVAJ WHOLESALE</p>
                  <p className="border-t border-slate-400 pt-1 mt-6">Authorized Signatory</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 no-print">
              <Button variant="outline" size="sm" onClick={() => setIsReceiptModalOpen(false)}>
                Close
              </Button>
              <Button variant="primary" size="sm" icon={Printer} onClick={handlePrint}>
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminBilling;
