import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Building2,
  X
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export const ShopBills = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected invoice for official print view modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', '50');

      const res = await api.get(`/billing/invoices?${params.toString()}`);
      if (res.data?.success && res.data?.data) {
        setInvoices(res.data.data.invoices || []);
      }
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInvoiceModal = async (inv) => {
    setSelectedInvoice(inv);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/billing/invoices/${inv.id}`);
      if (res.data?.success && res.data?.data?.invoice) {
        setInvoiceDetail(res.data.data.invoice);
      } else {
        setInvoiceDetail(inv);
      }
    } catch (err) {
      console.error('Failed to fetch invoice items', err);
      setInvoiceDetail(inv);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.order_number?.toLowerCase().includes(q)
    );
  });

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'partial':
        return <Badge variant="warning">Partial Paid</Badge>;
      default:
        return <Badge variant="danger">Unpaid</Badge>;
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Bills & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Download official B2B GST tax invoices, track payment status and due dates
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number (e.g. INV-2026-0001)..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {['all', 'unpaid', 'paid', 'partial'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-brand-600 text-white shadow-soft-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All Invoices' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No invoices found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tax invoices are automatically created upon warehouse dispatch.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500 transition-all shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-brand-600 dark:text-brand-400">
                    {inv.invoice_number}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Date: {new Date(inv.invoice_date || inv.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    ₹{parseFloat(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400">
                    (Tax: ₹{parseFloat(inv.tax_amount || 0).toFixed(2)})
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Linked Order: #{inv.order_number || 'Direct Wholesale'} • Due:{' '}
                  {inv.due_date
                    ? new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : '15 Days'}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                {getPaymentStatusBadge(inv.payment_status)}

                <Button
                  variant="secondary"
                  size="sm"
                  icon={Printer}
                  onClick={() => handleOpenInvoiceModal(inv)}
                  className="font-semibold text-xs"
                >
                  Print / View Bill
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official B2B GST Tax Invoice Printable Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => {
          setSelectedInvoice(null);
          setInvoiceDetail(null);
        }}
        title={`Tax Invoice #${selectedInvoice?.invoice_number}`}
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            {/* Printable Document Box */}
            <div
              id="printable-tax-invoice"
              className="p-6 bg-white text-slate-900 rounded-xl border border-slate-300 font-sans text-xs space-y-4"
            >
              {/* Top Title & Header */}
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-navy-950 tracking-tight">
                    PURVAJ WHOLESALE DISTRIBUTORS
                  </h2>
                  <p className="text-[11px] text-slate-600">Central Warehouse Node: PURVAJ_CENTRAL_01</p>
                  <p className="text-[11px] text-slate-600">Plot 45, GIDC Industrial Estate, Ahmedabad, Gujarat - 382445</p>
                  <p className="text-[11px] font-mono font-semibold text-slate-800">
                    GSTIN: 24AAACP9999P1Z5 • FSSAI: 10722000000123
                  </p>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded bg-slate-100 font-bold uppercase tracking-wider text-[11px] text-slate-800 border border-slate-300">
                    TAX INVOICE
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-900 mt-2">
                    {selectedInvoice.invoice_number}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Date: {new Date(selectedInvoice.invoice_date || selectedInvoice.created_at).toLocaleDateString('en-IN')}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Due Date: {new Date(selectedInvoice.due_date || Date.now() + 15 * 86400000).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Billed To */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Billed To (Retail Customer):
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {user?.shopName || selectedInvoice.shop_name || 'Retailer Partner'}
                </p>
                <p className="text-[11px] text-slate-600">
                  GSTIN: {user?.gstin || selectedInvoice.gstin || '24AAACP1234M1Z2'}
                </p>
                <p className="text-[11px] text-slate-600">
                  Storefront: {user?.shop?.city || 'Ahmedabad'}, Gujarat
                </p>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                    <th className="p-2 border-r border-slate-300 w-8">#</th>
                    <th className="p-2 border-r border-slate-300">Description of Goods</th>
                    <th className="p-2 border-r border-slate-300 w-16">HSN</th>
                    <th className="p-2 border-r border-slate-300 text-center w-14">Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right w-20">Rate</th>
                    <th className="p-2 border-r border-slate-300 text-right w-16">Tax %</th>
                    <th className="p-2 text-right w-24">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(invoiceDetail?.items || selectedInvoice.items || [
                    { description: 'FMCG Wholesale Package Consignment', hsn: '1905', quantity: 1, rate: selectedInvoice.subtotal || selectedInvoice.total_amount, tax_rate: 18 }
                  ]).map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border-r border-slate-200 text-slate-500">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-semibold">{item.product_name || item.name || item.description}</td>
                      <td className="p-2 border-r border-slate-200 font-mono text-slate-600">{item.hsn_code || item.hsn || '1905'}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">{item.quantity}</td>
                      <td className="p-2 border-r border-slate-200 text-right">₹{parseFloat(item.unit_price || item.rate || 0).toFixed(2)}</td>
                      <td className="p-2 border-r border-slate-200 text-right">{item.tax_rate || 18}%</td>
                      <td className="p-2 text-right font-bold">₹{parseFloat(item.total_amount || (item.quantity * (item.unit_price || item.rate || 0))).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-between items-start pt-2">
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>Payment Terms: <span className="font-semibold text-slate-800">15 Days Wholesale Credit</span></p>
                  <p>Bank: <span className="font-semibold text-slate-800">HDFC Bank Ltd, IFSC: HDFC0001234</span></p>
                  <p>A/C: <span className="font-semibold text-slate-800">50200012345678 (Purvaj Wholesale)</span></p>
                </div>

                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Taxable Value:</span>
                    <span className="font-semibold">₹{parseFloat(selectedInvoice.subtotal || selectedInvoice.total_amount * 0.82).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total GST:</span>
                    <span className="font-semibold">₹{parseFloat(selectedInvoice.tax_amount || selectedInvoice.total_amount * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-300">
                    <span>Total Amount:</span>
                    <span className="text-navy-950">₹{parseFloat(selectedInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedInvoice(null);
                  setInvoiceDetail(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Printer}
                onClick={() => window.print()}
                className="bg-brand-600 hover:bg-brand-500 font-bold shadow-soft"
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ShopBills;
