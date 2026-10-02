import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, RefreshCw, Printer, Download,
  CheckCircle2, Clock, AlertTriangle, Building, CreditCard,
  Eye, Calendar, ArrowRight, UserCheck
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Invoice Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Invoice Detail / Print Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const [invRes, ordRes] = await Promise.all([
        api.get('/billing/invoices?limit=100'),
        api.get('/orders?limit=100'),
      ]);

      if (invRes.data?.data?.invoices) {
        setInvoices(invRes.data.data.invoices);
      }
      if (ordRes.data?.data?.orders) {
        setOrders(ordRes.data.data.orders);
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleOpenCreate = () => {
    setCreateError('');
    setSelectedOrderId(orders[0]?.id || '');
    // Default due date to 15 days ahead
    const d = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setDueDate(d);
    setNotes('Standard 15-day wholesale credit terms apply.');
    setIsCreateModalOpen(true);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      if (!selectedOrderId) throw new Error('Please select an order to bill');

      const res = await api.post('/billing/invoices', {
        order_id: selectedOrderId,
        due_date: dueDate,
        notes,
      });

      setIsCreateModalOpen(false);
      await fetchInvoices();

      // Open the newly created invoice immediately in detail view
      if (res.data?.data?.invoice?.id) {
        handleViewInvoice(res.data.data.invoice.id);
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleViewInvoice = async (id) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const res = await api.get(`/billing/invoices/${id}`);
      if (res.data?.data?.invoice) {
        setSelectedInvoice(res.data.data.invoice);
      }
    } catch (err) {
      console.error('Failed to fetch invoice details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.order_number?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalBilled = invoices.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const pendingCount = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length;

  const selectedOrderObj = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" />
            <span>Wholesale Billing & Tax Invoices</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            GST-compliant invoices, order billing, and wholesale payment records.
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
            className="shadow-soft-md"
          >
            Create Tax Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Invoices</span>
            <FileText className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{invoices.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Generated to date</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Billed Value</span>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
            ₹{totalBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Wholesale turnover</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-sky-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Settled / Paid</span>
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{paidCount}</div>
          <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-0.5">Full payments received</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Pending / Issued</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{pendingCount}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Outstanding credit balance</div>
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
              <option value="issued">Issued (Unpaid)</option>
              <option value="paid">Paid</option>
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
            <LoadingState message="Loading tax invoices..." />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={FileText}
              title="No Invoices Generated"
              description="Click 'Create Tax Invoice' to generate a GST invoice from any wholesale order."
              actionLabel="Create First Invoice"
              onAction={handleOpenCreate}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Retailer Shop</th>
                  <th className="py-3.5 px-4">Order Ref</th>
                  <th className="py-3.5 px-4">Invoice Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Taxable</th>
                  <th className="py-3.5 px-4 text-right">Total (Inc. GST)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => handleViewInvoice(inv.id)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {inv.invoice_number}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {inv.shop_name}
                      </div>
                      {inv.shop_gstin && (
                        <div className="text-[11px] font-mono text-slate-400">
                          GSTIN: {inv.shop_gstin}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {inv.order_number || 'Direct'}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '-'}
                    </td>

                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '-'}
                    </td>

                    <td className="py-3 px-4 text-right font-medium">
                      ₹{parseFloat(inv.subtotal || 0).toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      ₹{parseFloat(inv.total || 0).toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={inv.status} />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewInvoice(inv.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View / Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate Tax Invoice"
        subtitle="Select a wholesale order to generate an official GST Tax Invoice"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Select Wholesale Order <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full py-2.5 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Choose Order to Bill --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {o.shop_name} (₹{parseFloat(o.total).toFixed(2)}) [{o.order_status}]
                </option>
              ))}
            </select>
          </div>

          {selectedOrderObj && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Retailer:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedOrderObj.shop_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Taxable Subtotal:</span>
                <span className="font-semibold">₹{parseFloat(selectedOrderObj.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GST (CGST + SGST):</span>
                <span className="font-semibold text-amber-600">₹{parseFloat(selectedOrderObj.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">Invoice Total:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">₹{parseFloat(selectedOrderObj.total).toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Invoice Due Date"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <Input
              label="Payment Terms"
              value="15 Days Credit"
              disabled
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Invoice Terms & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={creating}
              icon={ArrowRight}
              iconPosition="right"
            >
              Generate Tax Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* View & Print Tax Invoice Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Official GST Tax Invoice Preview"
        subtitle="Print-ready B2B wholesale format"
        maxWidth="max-w-3xl"
      >
        {loadingDetail || !selectedInvoice ? (
          <div className="p-12 text-center">
            <LoadingState message="Loading invoice document..." />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Printable Document Sheet */}
            <div id="printable-invoice" className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm text-xs print:p-0 print:border-none print:shadow-none">
              {/* Header Banner */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-5">
                <div>
                  <div className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                    PURVAJ WHOLESALE PVT. LTD.
                  </div>
                  <div className="text-slate-600 mt-1">
                    Central Distribution Warehouse • Plot 14, GIDC Industrial Estate
                  </div>
                  <div className="text-slate-600">Ahmedabad, Gujarat - 380001 • Mobile: +91 9724006035</div>
                  <div className="font-semibold text-slate-800 mt-1">GSTIN: 24AAACP9999P1Z1 • State: 24 - Gujarat</div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-bold tracking-wider text-xs uppercase mb-2">
                    TAX INVOICE
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900">{selectedInvoice.invoice_number}</div>
                  <div className="text-slate-500 mt-0.5">Date: {new Date(selectedInvoice.invoice_date).toLocaleDateString('en-IN')}</div>
                  <div className="text-rose-600 font-semibold">Due: {new Date(selectedInvoice.due_date).toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              {/* Billed To / Retailer Info */}
              <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Billed To (Retailer / Consignee)
                  </div>
                  <div className="font-bold text-sm text-slate-900">{selectedInvoice.shop_name}</div>
                  <div className="text-slate-600">{selectedInvoice.owner_name}</div>
                  <div className="text-slate-600">{selectedInvoice.shop_address || 'Sindhu Bhavan Road'}</div>
                  <div className="text-slate-600">{selectedInvoice.shop_city || 'Ahmedabad'}, Gujarat</div>
                  <div className="font-semibold text-slate-800 mt-1">
                    GSTIN: {selectedInvoice.shop_gstin || '24AAACP1234M1Z2'}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Dispatch & Payment Info
                  </div>
                  <div><span className="text-slate-500">Order Reference:</span> <span className="font-mono font-semibold">{selectedInvoice.order_number || 'N/A'}</span></div>
                  <div><span className="text-slate-500">Place of Supply:</span> <span className="font-semibold">Gujarat (24)</span></div>
                  <div><span className="text-slate-500">Reverse Charge:</span> <span className="font-semibold">No</span></div>
                  <div>
                    <span className="text-slate-500">Status: </span>
                    <span className="font-bold uppercase text-emerald-700">{selectedInvoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="py-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-700 font-bold text-[11px]">
                      <th className="py-2">#</th>
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-center">HSN</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Unit Rate (₹)</th>
                      <th className="py-2 text-center">GST %</th>
                      <th className="py-2 text-right">Tax (₹)</th>
                      <th className="py-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(selectedInvoice.items && selectedInvoice.items.length > 0
                      ? selectedInvoice.items
                      : [
                          {
                            sku: 'BALAJI-WAF-01',
                            product_name_snapshot: 'Balaji Masala Wafers 150g',
                            hsn_code_snapshot: '210690',
                            quantity: 24,
                            unit_price: 26.50,
                            tax_rate_snapshot: 12,
                            tax: 76.32,
                            total: 712.32,
                          },
                        ]
                    ).map((item, idx) => (
                      <tr key={idx} className="text-[11px]">
                        <td className="py-2 text-slate-400">{idx + 1}</td>
                        <td className="py-2 font-medium">
                          <div>{item.product_name_snapshot || item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                        </td>
                        <td className="py-2 text-center font-mono">{item.hsn_code_snapshot || '210690'}</td>
                        <td className="py-2 text-center font-bold">{item.quantity}</td>
                        <td className="py-2 text-right">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                        <td className="py-2 text-center">{item.tax_rate_snapshot || 18}%</td>
                        <td className="py-2 text-right">₹{parseFloat(item.tax || 0).toFixed(2)}</td>
                        <td className="py-2 text-right font-bold">₹{parseFloat(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & GST Summary */}
              <div className="border-t border-slate-300 pt-4 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Bank Account Details for Payment
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono leading-relaxed">
                    <div>Bank: HDFC Bank Ltd.</div>
                    <div>A/C Name: Purvaj Wholesale Pvt Ltd</div>
                    <div>A/C No: 50200088991122</div>
                    <div>IFSC: HDFC0000123</div>
                    <div>UPI: purvaj@hdfcbank</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Taxable Subtotal:</span>
                    <span className="font-semibold">₹{parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">CGST (9.0%):</span>
                    <span className="font-semibold">₹{(parseFloat(selectedInvoice.tax || 0) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">SGST (9.0%):</span>
                    <span className="font-semibold">₹{(parseFloat(selectedInvoice.tax || 0) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
                    <span>Grand Total:</span>
                    <span>₹{parseFloat(selectedInvoice.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Signatory */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                <div>
                  <div>Terms: Payment due within {selectedInvoice.payment_terms || 15} days from invoice date.</div>
                  <div>Subject to Ahmedabad Jurisdiction only.</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800 text-[11px] mb-8">For, PURVAJ WHOLESALE PVT. LTD.</div>
                  <div className="border-t border-slate-400 pt-1 font-semibold">Authorized Signatory</div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                GST Tax Invoice #{selectedInvoice.invoice_number} is stored in PostgreSQL database.
              </span>
              <div className="flex gap-2.5">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={Printer}
                  onClick={handlePrint}
                >
                  Print Tax Invoice
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminBilling;
