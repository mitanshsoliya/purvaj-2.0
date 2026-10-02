import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
  Receipt,
  Info,
  QrCode,
  Smartphone,
  Banknote
} from 'lucide-react';
import api from '../../services/api';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useToast } from '../../context/ToastContext';

export const PaymentModal = ({
  isOpen,
  onClose,
  onSuccess,
  defaultInvoice = null,
  defaultOrder = null,
  outstandingBalance = 0,
  shopDetails = null,
}) => {
  const { addToast } = useToast();

  // Step: 'input' | 'processing' | 'success' | 'failed'
  const [step, setStep] = useState('input');
  const [paymentMethod, setPaymentMethod] = useState('online_gateway'); // 'online_gateway' | 'upi' | 'bank_transfer' | 'cash' | 'credit'
  const [payOption, setPayOption] = useState(defaultInvoice ? 'invoice' : 'full'); // 'full' | 'invoice' | 'custom'
  const [customAmount, setCustomAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [intentData, setIntentData] = useState(null);
  const [successPayment, setSuccessPayment] = useState(null);

  // Initialize amount based on default targets
  useEffect(() => {
    if (defaultInvoice) {
      setPayOption('invoice');
      const due = parseFloat(defaultInvoice.balance_due || defaultInvoice.total || 0);
      setCustomAmount(due > 0 ? due.toString() : '');
    } else if (defaultOrder) {
      setPayOption('custom');
      setCustomAmount(parseFloat(defaultOrder.total || 0).toString());
    } else {
      setPayOption('full');
      setCustomAmount(outstandingBalance > 0 ? outstandingBalance.toString() : '');
    }
    setStep('input');
    setErrorMessage('');
    setIntentData(null);
    setSuccessPayment(null);
  }, [isOpen, defaultInvoice, defaultOrder, outstandingBalance]);

  const targetAmount = () => {
    if (payOption === 'invoice' && defaultInvoice) {
      return parseFloat(defaultInvoice.balance_due || defaultInvoice.total || 0);
    }
    if (payOption === 'full') {
      return parseFloat(outstandingBalance || 0);
    }
    return parseFloat(customAmount || 0);
  };

  const handleStartPayment = async () => {
    const amt = targetAmount();
    if (!amt || isNaN(amt) || amt <= 0) {
      addToast('Please enter a valid payment amount greater than ₹0', 'error');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Generate client idempotency key to prevent double charging
      const idempotencyKey = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 2. Request backend payment intent (Backend enforces security & verification)
      const res = await api.post('/payments/intent', {
        amount: amt,
        method: paymentMethod,
        invoice_id: defaultInvoice?.id || null,
        order_id: defaultOrder?.id || null,
        idempotency_key: idempotencyKey,
        notes: notes || undefined,
      });

      if (!res.data?.success || !res.data?.data) {
        throw new Error(res.data?.message || 'Failed to initialize payment gateway');
      }

      const intent = res.data.data;
      setIntentData(intent);

      // Handle offline or credit directly
      if (['cash', 'bank_transfer', 'credit'].includes(paymentMethod)) {
        setStep('processing');
        return;
      }

      // Check if real Razorpay is active or sandbox simulator
      if (intent.isSandbox) {
        setStep('processing');
      } else if (window.Razorpay && intent.gatewayOrderId) {
        // Real Razorpay Checkout flow
        const options = {
          key: intent.keyId,
          amount: intent.amount * 100,
          currency: intent.currency || 'INR',
          name: 'Purvaj Wholesale B2B',
          description: `Payment for ${defaultInvoice ? 'Invoice ' + defaultInvoice.invoice_number : 'Wholesale Dues'}`,
          order_id: intent.gatewayOrderId,
          handler: async function (response) {
            await handleVerifyPayment({
              payment_transaction_id: intent.paymentTransactionId,
              gateway_payment_id: response.razorpay_payment_id,
              gateway_signature: response.razorpay_signature,
            });
          },
          prefill: {
            name: shopDetails?.owner_name || 'Retailer',
            contact: shopDetails?.mobile || '',
          },
          theme: { color: '#0f766e' },
          modal: {
            ondismiss: function () {
              setLoading(false);
              addToast('Payment cancelled by user', 'info');
            },
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback to sandbox simulator mode
        setStep('processing');
      }
    } catch (err) {
      console.error('Payment intent error:', err);
      const msg = err.response?.data?.message || err.message || 'Payment initiation failed';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (simulationOutcome = 'SUCCESS') => {
    if (!intentData) return;
    setLoading(true);

    try {
      const payload = typeof simulationOutcome === 'object' ? simulationOutcome : {
        payment_transaction_id: intentData.paymentTransactionId,
        gateway_payment_id: `SIM_PAY_${Date.now()}`,
        gateway_signature: `SIM_SIG_${Date.now()}`,
        simulated_status: simulationOutcome,
      };

      const res = await api.post('/payments/verify', payload);

      if (res.data?.success) {
        setSuccessPayment(res.data.data.payment || res.data.data);
        setStep('success');
        addToast('Payment processed and recorded successfully!', 'success');
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.data?.message || 'Payment verification failed');
        setStep('failed');
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      setErrorMessage(err.response?.data?.message || 'Gateway verification failed');
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={step === 'success' ? 'Payment Successful' : step === 'failed' ? 'Payment Failed' : 'B2B Wholesale Settlement'}
      size="md"
    >
      <div className="space-y-5">
        {/* STEP 1: PAYMENT INPUT */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* Header Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {defaultInvoice ? `Invoice: ${defaultInvoice.invoice_number}` : 'Outstanding Balance'}
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  ₹{targetAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                <Lock className="w-3.5 h-3.5" />
                <span>256-Bit Encrypted</span>
              </div>
            </div>

            {/* Payment Scope Option */}
            {!defaultInvoice && outstandingBalance > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Settlement Amount Option
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayOption('full');
                      setCustomAmount(outstandingBalance.toString());
                    }}
                    className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                      payOption === 'full'
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-bold text-slate-900 dark:text-white">Full Outstanding</span>
                    <span className="text-[11px] text-slate-500">₹{parseFloat(outstandingBalance).toLocaleString('en-IN')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayOption('custom')}
                    className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                      payOption === 'custom'
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="block font-bold text-slate-900 dark:text-white">Custom / Partial</span>
                    <span className="text-[11px] text-slate-500">Pay specific amount</span>
                  </button>
                </div>
              </div>
            )}

            {/* Amount input if Custom or default target */}
            {(payOption === 'custom' || (!defaultInvoice && outstandingBalance === 0)) && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Payable Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Select Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online_gateway')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                    paymentMethod === 'online_gateway'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <div>
                    <span className="block leading-tight">Online Gateway</span>
                    <span className="text-[10px] text-slate-400 font-normal">UPI, Cards, NetBanking</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                    paymentMethod === 'upi'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <div>
                    <span className="block leading-tight">Direct UPI</span>
                    <span className="text-[10px] text-slate-400 font-normal">GPay, PhonePe, Paytm</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <div>
                    <span className="block leading-tight">Bank Transfer</span>
                    <span className="text-[10px] text-slate-400 font-normal">NEFT / RTGS / IMPS</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                    paymentMethod === 'cash'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <div>
                    <span className="block leading-tight">Cash at Desk</span>
                    <span className="text-[10px] text-slate-400 font-normal">Central Warehouse</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Remarks note */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Payment Remarks / Transaction UTR (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cleared via Cheque / UPI UTR #123456"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartPayment}
                disabled={loading || targetAmount() <= 0}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Pay ₹{targetAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING / SANDBOX SIMULATOR */}
        {step === 'processing' && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Gateway Architecture: {intentData?.gatewayProvider === 'razorpay' ? 'Razorpay Gateway' : 'Secure Test / Sandbox Mode'}</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
                Transaction Reference: <strong className="font-mono">{intentData?.transactionRef}</strong>
                <br />
                Payable Amount: <strong>₹{intentData?.amount?.toLocaleString('en-IN')}</strong>
              </p>
              <div className="text-[11px] text-amber-700 dark:text-amber-400/80 pt-1">
                * In safe test/development mode, you can verify both the success webhook callback and failure recovery handling.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleVerifyPayment('SUCCESS')}
                disabled={loading}
                className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                <span>Authorize & Complete Payment</span>
                <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">Records credit & updates ledger</span>
              </button>

              <button
                type="button"
                onClick={() => handleVerifyPayment('FAILED')}
                disabled={loading}
                className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-200 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all"
              >
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Simulate Decline / Timeout</span>
                <span className="text-[10px] font-normal text-rose-600 dark:text-rose-400">Verifies error recovery handling</span>
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={loading}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Back to Payment Details
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS STATE */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-3">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Wholesale Payment Settled!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your payment of <strong>₹{intentData?.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> has been verified.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-left space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Ref:</span>
                <span className="font-bold text-slate-900 dark:text-white">{successPayment?.payment_reference || intentData?.transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mode:</span>
                <span className="uppercase text-slate-900 dark:text-white">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-600 font-bold uppercase">PAID & VERIFIED</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              {successPayment?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/api/payments/${successPayment.id}/print`, '_blank')}
                  className="flex items-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Print Receipt Voucher</span>
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: FAILED STATE */}
        {step === 'failed' && (
          <div className="text-center space-y-4 py-3">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Payment Verification Failed
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                {errorMessage || 'The gateway declined or failed to authorize the transaction.'}
              </p>
            </div>

            <p className="text-xs text-slate-500">
              No amount has been deducted from your Udhaar balance. Please try another payment mode or contact Purvaj Accounts Desk.
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => setStep('input')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PaymentModal;
