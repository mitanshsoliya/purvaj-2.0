import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Scale,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Copy,
  CheckCircle2,
  Calendar,
  FileText,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import PaymentModal from '../../components/payment/PaymentModal';

export const ShopPayments = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('payments'); // 'payments' | 'ledger'
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Shop financials
  const [shopProfile, setShopProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [ledger, setLedger] = useState([]);

  useEffect(() => {
    fetchFinancialData();
  }, []);


  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [profileRes, paymentsRes, ledgerRes] = await Promise.allSettled([
        api.get('/shops/profile'),
        api.get('/payments?limit=50'),
        api.get('/shops/ledger?limit=50'),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.data?.shop) {
        setShopProfile(profileRes.value.data.data.shop);
      } else if (user?.shop) {
        setShopProfile(user.shop);
      }

      if (paymentsRes.status === 'fulfilled' && paymentsRes.value.data?.data) {
        setPayments(paymentsRes.value.data.data.payments || []);
      }

      if (ledgerRes.status === 'fulfilled' && ledgerRes.value.data?.data) {
        setLedger(ledgerRes.value.data.data.ledger || []);
      }
    } catch (err) {
      console.error('Failed to load financial records', err);
    } finally {
      setLoading(false);
    }
  };

  const creditLimit = parseFloat(shopProfile?.credit_limit || 250000);
  const creditUsed = parseFloat(shopProfile?.credit_used || 0);
  const availableCredit = Math.max(0, creditLimit - creditUsed);
  const creditPercent = Math.min(100, Math.round((creditUsed / creditLimit) * 100)) || 0;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard!`, 'info');
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Payments & Udhaar Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Wholesale credit limits, payment receipts, and running account statement
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsPaymentModalOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <CreditCard className="w-4 h-4" />
          <span>Pay Now / Settle Udhaar</span>
        </Button>
      </div>

      {/* Credit Standing Card */}
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-brand-950 text-white rounded-2xl p-5 sm:p-6 shadow-soft-lg border border-navy-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-semibold text-brand-300 uppercase tracking-wider">
                Approved Credit Facility
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {user?.shopName || shopProfile?.shop_name || 'Shree Krishna Traders'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block uppercase">Payment Terms</span>
              <span className="text-sm font-bold text-emerald-400">
                {shopProfile?.payment_terms || '15-Day Wholesale Credit'}
              </span>
            </div>
            {creditUsed > 0 && (
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all"
              >
                Clear Dues
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Assigned Credit Limit
            </span>
            <span className="text-lg sm:text-xl font-bold text-white mt-0.5 block">
              ₹{creditLimit.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Outstanding Udhaar Balance
            </span>
            <span className={`text-lg sm:text-xl font-bold mt-0.5 block ${creditUsed > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              ₹{creditUsed.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Available Credit for New Orders
            </span>
            <span className="text-lg sm:text-xl font-bold text-emerald-400 mt-0.5 block">
              ₹{availableCredit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] text-slate-300">
            <span>Credit Utilization: {creditPercent}%</span>
            <span>₹{availableCredit.toLocaleString('en-IN')} Remaining</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                creditPercent > 80 ? 'bg-rose-500' : creditPercent > 50 ? 'bg-amber-500' : 'bg-brand-500'
              }`}
              style={{ width: `${creditPercent}%` }}
            />
          </div>
        </div>
      </div>


      {/* Bank Account Transfer Details for Payments */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Purvaj Wholesale Central Bank Account (For NEFT / RTGS / UPI)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Bank & Branch</span>
              <span className="font-bold text-slate-900 dark:text-white">HDFC Bank, Ahmedabad</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Account Number</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">50200012345678</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('50200012345678', 'Account Number')}
              className="text-slate-400 hover:text-brand-600 p-1"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">IFSC Code & UPI</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">HDFC0001234</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('HDFC0001234', 'IFSC Code')}
              className="text-slate-400 hover:text-brand-600 p-1"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Payment History vs Udhaar Ledger */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment History ({payments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Double-Entry Statement Ledger ({ledger.length})</span>
        </button>
      </div>

      {/* TAB 1: Payment History */}
      {activeTab === 'payments' && (
        <Card title="Recorded Payments & Receipts" subtitle="Wholesale settlements credited to your shop account">
          {payments.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Payments Recorded Yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Payments made via Cash, Cheque, or NEFT will appear here once verified by warehouse billing.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => (
                <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white capitalize">
                        {p.method || 'Bank Transfer'} Payment
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ref: {p.transaction_reference || 'CASH-RCPT'} • Date:{' '}
                        {new Date(p.payment_date || p.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block">
                        +₹{parseFloat(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <Badge variant="success">Confirmed</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.open(`/api/payments/${p.id}/print`, '_blank')}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-brand-600 transition-colors"
                      title="Print Official Payment Receipt"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: Udhaar Running Ledger */}
      {activeTab === 'ledger' && (
        <Card title="Account Statement Ledger" subtitle="Chronological debit & credit transactions">
          {ledger.length === 0 ? (
            <div className="py-12 text-center">
              <Scale className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Ledger Entries</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your invoices, payment credits, and returns will create an audit ledger entry here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Reference</th>
                    <th className="pb-2 text-right">Debit (Invoice)</th>
                    <th className="pb-2 text-right">Credit (Payment)</th>
                    <th className="pb-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3 font-semibold capitalize text-slate-800 dark:text-slate-200">
                        {entry.transaction_type}
                      </td>
                      <td className="py-3 font-mono text-slate-500">
                        {entry.reference_type || 'TXN'}
                      </td>
                      <td className="py-3 text-right font-medium text-slate-900 dark:text-white">
                        {parseFloat(entry.debit) > 0 ? `₹${parseFloat(entry.debit).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 text-right font-medium text-emerald-600">
                        {parseFloat(entry.credit) > 0 ? `₹${parseFloat(entry.credit).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(entry.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Payment Processing Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          fetchFinancialData();
        }}
        outstandingBalance={creditUsed}
        shopDetails={shopProfile}
      />
    </div>
  );
};

export default ShopPayments;

