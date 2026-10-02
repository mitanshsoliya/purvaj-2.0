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
  X,
  Receipt
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
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' | 'thermal'

  // Payment receipt modal
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

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
    setPrintFormat('a4');
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

  const handleViewReceipt = async (paymentId) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt`);
      if (res.data?.success && res.data?.data?.receipt) {
        setPaymentReceipt(res.data.data.receipt);
        setIsReceiptModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch receipt', err);
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
        return <Badge variant="success">Paid in Full</Badge>;
      case 'partially_paid':
        return <Badge variant="warning">Partially Paid</Badge>;
      default:
        return <Badge variant="danger">Unpaid / Due</Badge>;
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
            Download official B2B GST tax invoices, thermal slips, payment vouchers, and track due dates
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
            placeholder="Search by invoice number (e.g. INV-20261002)..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {['all', 'unpaid', 'paid', 'partially_paid'].map((st) => (
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
              {st === 'all' ? 'All Invoices' : st.replace('_', ' ')}
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
                    ₹{parseFloat(inv.total || inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400">
                    (Tax: ₹{parseFloat(inv.tax || inv.tax_amount || 0).toFixed(2)})
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
                {getPaymentStatusBadge(inv.status)}

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

      {/* Official B2B GST Tax Invoice & Thermal Receipt Printable Modal */}
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
                <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>
                  Print / Save PDF
                </Button>
              </div>
            </div>

            {/* A4 FORMAT */}
            {printFormat === 'a4' ? (
              <div
                id="printable-tax-invoice"
                className="printable-area p-6 bg-white text-slate-900 rounded-xl border border-slate-300 font-sans text-xs space-y-4"
              >
                {/* Top Title & Header */}
                <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950 uppercase tracking-tight">
                      PURVAJ WHOLESALE DISTRIBUTORS
                    </h2>
                    <p className="text-[11px] text-slate-600">Central Warehouse Node: PURVAJ_CENTRAL_01</p>
                    <p className="text-[11px] text-slate-600">Plot 45, GIDC Industrial Estate, Naroda, Ahmedabad, Gujarat - 382445</p>
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
                    <p className="text-[11px] text-rose-600 font-semibold">
                      Due Date: {new Date(selectedInvoice.due_date || Date.now() + 15 * 86400000).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Billed To */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Billed To (Retail Customer):
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {user?.shopName || selectedInvoice.shop_name || 'Retailer Partner'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      GSTIN: {user?.gstin || selectedInvoice.shop_gstin || '24AAACP1234M1Z2'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Storefront: {user?.shop?.city || selectedInvoice.shop_city || 'Ahmedabad'}, Gujarat
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <p><span className="text-slate-500">Order Reference:</span> <span className="font-mono font-bold">#{selectedInvoice.order_number || 'Direct'}</span></p>
                    <p><span className="text-slate-500">Payment Status:</span> <span className="font-bold uppercase text-emerald-700">{selectedInvoice.status}</span></p>
                    <p><span className="text-slate-500">Outstanding:</span> <span className="font-bold text-rose-600">₹{parseFloat(selectedInvoice.outstanding ?? selectedInvoice.total ?? selectedInvoice.total_amount).toFixed(2)}</span></p>
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800">
                      <th className="p-2 border-r border-slate-300 w-8">#</th>
                      <th className="p-2 border-r border-slate-300">Description of Goods</th>
                      <th className="p-2 border-r border-slate-300 text-center w-16">HSN</th>
                      <th className="p-2 border-r border-slate-300 text-center w-14">Qty</th>
                      <th className="p-2 border-r border-slate-300 text-right w-20">Rate</th>
                      <th className="p-2 border-r border-slate-300 text-right w-16">Tax %</th>
                      <th className="p-2 text-right w-24">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(invoiceDetail?.items || selectedInvoice.items || [
                      { item_name: 'FMCG Wholesale Package Consignment', hsn_code: '1905', quantity: 1, rate: selectedInvoice.subtotal || selectedInvoice.total, tax_rate: 18 }
                    ]).map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r border-slate-200 text-slate-500">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">{item.item_name || item.product_name || item.name}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-600">{item.hsn_code || '1905'}</td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold">{item.quantity}</td>
                        <td className="p-2 border-r border-slate-200 text-right">₹{parseFloat(item.rate || item.unit_price || 0).toFixed(2)}</td>
                        <td className="p-2 border-r border-slate-200 text-right">{item.tax_rate || 18}%</td>
                        <td className="p-2 text-right font-bold">₹{parseFloat(item.total_amount || (item.quantity * (item.rate || item.unit_price || 0))).toFixed(2)}</td>
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
                      <span className="font-semibold">₹{parseFloat(selectedInvoice.subtotal || selectedInvoice.total * 0.82).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total GST:</span>
                      <span className="font-semibold">₹{parseFloat(selectedInvoice.tax || selectedInvoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-300">
                      <span>Total Amount:</span>
                      <span className="text-navy-950">₹{parseFloat(selectedInvoice.total || selectedInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Receipt Links if payments exist */}
                {invoiceDetail?.payments && invoiceDetail.payments.length > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 space-y-1.5 no-print">
                    <p className="font-bold">Payments Recorded for this Invoice:</p>
                    {invoiceDetail.payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center text-[11px]">
                        <span>
                          ₹{parseFloat(p.amount).toFixed(2)} via {p.method?.toUpperCase()} on {new Date(p.payment_date || p.created_at).toLocaleDateString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(p.id)}
                          className="font-bold underline text-brand-700 hover:text-brand-900"
                        >
                          View Receipt Voucher ➔
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* THERMAL 80MM POS RECEIPT */
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
                </div>

                <div className="divide-y divide-dashed divide-slate-300 py-1">
                  {(invoiceDetail?.items || selectedInvoice.items || []).map((item, idx) => (
                    <div key={idx} className="py-1">
                      <p className="font-bold truncate">{item.item_name || item.product_name || item.name}</p>
                      <div className="flex justify-between">
                        <span>{item.quantity} x ₹{parseFloat(item.rate || item.unit_price || 0).toFixed(2)}</span>
                        <span className="font-bold">₹{parseFloat(item.total_amount || (item.quantity * item.rate)).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-400 pt-2 space-y-0.5 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{parseFloat(selectedInvoice.subtotal || selectedInvoice.total * 0.82).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total GST:</span>
                    <span>₹{parseFloat(selectedInvoice.tax || selectedInvoice.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-400">
                    <span>GRAND TOTAL:</span>
                    <span>₹{parseFloat(selectedInvoice.total || selectedInvoice.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[9px] text-slate-600">
                  <p>THANK YOU FOR YOUR WHOLESALE BUSINESS!</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* PAYMENT RECEIPT MODAL */}
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
                <p className="text-[10px] text-slate-600">Central Warehouse Hub • GSTIN: 24AAACP9999P1Z5</p>
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
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="capitalize font-semibold">{paymentReceipt.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
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
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 no-print">
              <Button variant="outline" size="sm" onClick={() => setIsReceiptModalOpen(false)}>
                Close
              </Button>
              <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ShopBills;
