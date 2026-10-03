import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle2,
  AlertCircle,
  Package,
  FileText,
  Clock
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export const ShopCart = () => {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    taxTotal,
    taxBreakdown,
    grandTotal,
    moqViolations,
    stockViolations,
    isValidForCheckout,
  } = useCart();

  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Shop Credit Standing
  const [shopProfile, setShopProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Checkout inputs
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentOption, setPaymentOption] = useState('credit'); // credit | cod | bank_transfer
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  useEffect(() => {
    fetchShopProfile();
  }, []);

  const fetchShopProfile = async () => {
    try {
      const res = await api.get('/shops/profile');
      if (res.data?.success && res.data?.data?.shop) {
        const s = res.data.data.shop;
        setShopProfile(s);
        setDeliveryAddress(
          `${s.address || ''}, ${s.city || ''} ${s.pincode || ''}`.trim() || 'Main Shop Address'
        );
      } else if (user?.shop) {
        setShopProfile(user.shop);
        setDeliveryAddress(user.shop.city ? `${user.shop.city} Storefront` : 'Registered Address');
      }
    } catch (err) {
      console.error('Failed to load shop profile', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const creditLimit = parseFloat(shopProfile?.credit_limit || 250000);
  const creditUsed = parseFloat(shopProfile?.credit_used || 0);
  const availableCredit = Math.max(0, creditLimit - creditUsed);
  const isCreditExceeded = paymentOption === 'credit' && grandTotal > availableCredit;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      addToast('Cart is empty', 'warning');
      return;
    }

    if (moqViolations.length > 0) {
      addToast(`Please meet Minimum Order Quantity for ${moqViolations[0].name}`, 'warning');
      return;
    }

    if (isCreditExceeded) {
      addToast('Order total exceeds your available Udhaar credit limit. Choose COD or Bank Transfer.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
        })),
        notes: deliveryNotes ? `Delivery Instructions: ${deliveryNotes}` : undefined,
        payment_method: paymentOption,
        delivery_address: deliveryAddress,
      };

      const res = await api.post('/orders', payload);
      if (res.data?.success && res.data?.data?.order) {
        const placed = res.data.data.order;
        setCompletedOrder(placed);
        clearCart();
        addToast('Wholesale order successfully placed!', 'success');
      } else {
        throw new Error(res.data?.message || 'Failed to place order');
      }
    } catch (err) {
      console.error('Order placement failed', err);
      addToast(err.response?.data?.message || err.message || 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Order Placed Success Confirmation Screen
  if (completedOrder) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-soft">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Wholesale Order Confirmed!
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Order Reference:{' '}
            <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
              #{completedOrder.order_number}
            </span>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-left space-y-3 shadow-soft">
          <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Order Date:</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {new Date(completedOrder.created_at || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Total Invoice Amount:</span>
            <span className="text-base font-bold text-slate-900 dark:text-white">
              ₹{parseFloat(completedOrder.total_amount ?? completedOrder.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Payment Mode:</span>
            <span className="capitalize font-semibold text-slate-900 dark:text-white">
              {paymentOption === 'credit'
                ? 'Wholesale Credit (Udhaar - 15 Days)'
                : paymentOption === 'cod'
                ? 'Cash on Delivery (COD)'
                : 'Direct Bank NEFT/RTGS'}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Fulfillment Center:</span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              Purvaj Central Warehouse (Hub 01)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/40 text-left flex items-start gap-3">
          <Truck className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-brand-900 dark:text-brand-200">
            <p className="font-bold">Next-Day Wholesale Delivery Scheduled</p>
            <p className="text-brand-700 dark:text-brand-300 mt-0.5">
              The warehouse dispatch team is packing your carton items. A delivery vehicle gate-pass with 4-digit drop-off OTP will be issued upon dispatch.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            icon={Package}
            onClick={() => navigate('/shop/orders')}
            className="w-full sm:w-auto"
          >
            Track My Order ➔
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={FileText}
            onClick={() => navigate('/shop/bills')}
            className="w-full sm:w-auto"
          >
            View Tax Invoices
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/shop/products')}
            className="w-full sm:w-auto"
          >
            Order More Products
          </Button>
        </div>
      </div>
    );
  }

  // Empty Cart State
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-4">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
          Your wholesale cart is empty
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
          Explore our FMCG wholesale catalog or use Quick Bulk Order to add items by SKU.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link to="/shop/products">
            <Button variant="primary" size="md" icon={Package}>
              Browse Wholesale Catalog
            </Button>
          </Link>
          <Link to="/shop/quick-order">
            <Button variant="secondary" size="md">
              Quick Bulk Order
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Wholesale Cart & Checkout
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {items.length} unique products • {items.reduce((s, i) => s + i.quantity, 0)} total units
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-2 space-y-3">
          <Card title="Order Items" subtitle="Derives your store-specific wholesale prices">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => {
                const itemSub = item.price * item.quantity;
                const itemTax = (itemSub * item.taxRate) / 100;
                const itemTotal = itemSub + itemTax;
                const isMoqViolated = item.quantity < item.moq;
                const isStockViolated = item.stock > 0 && item.quantity > item.stock;

                return (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          SKU: {item.sku} • ₹{item.price.toFixed(2)} / unit • {item.taxRate}% GST
                        </p>

                        {/* Validation alerts */}
                        {isMoqViolated && (
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            Minimum Order Quantity is {item.moq} {item.unit || 'pcs'}
                          </p>
                        )}
                        {isStockViolated && (
                          <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            Only {item.stock} available in warehouse
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pl-15 sm:pl-0">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-bold text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total */}
                      <div className="text-right min-w-[90px]">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          ₹{itemTotal.toFixed(2)}
                        </p>
                        <span className="text-[10px] text-slate-400 block">
                          incl. ₹{itemTax.toFixed(2)} GST
                        </span>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Delivery & Instructions Card */}
          <Card title="Delivery & Instructions">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter shop storefront address..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Delivery Notes / Gate Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Deliver before 2:00 PM, call upon arrival..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Financial Summary & Payment Options */}
        <div className="space-y-4">
          {/* Payment Method Selector Card */}
          <Card title="Payment Method">
            <div className="space-y-2.5">
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentOption === 'credit'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  value="credit"
                  checked={paymentOption === 'credit'}
                  onChange={() => setPaymentOption('credit')}
                  className="mt-1 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span>Wholesale Udhaar (15 Days)</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Debit from your approved credit line
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] mt-1">
                    Available Credit: ₹{availableCredit.toLocaleString('en-IN')}
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentOption === 'cod'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  value="cod"
                  checked={paymentOption === 'cod'}
                  onChange={() => setPaymentOption('cod')}
                  className="mt-1 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash on Delivery (COD)</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Pay physical cash to warehouse vehicle driver
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentOption === 'bank_transfer'
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentOption"
                  value="bank_transfer"
                  checked={paymentOption === 'bank_transfer'}
                  onChange={() => setPaymentOption('bank_transfer')}
                  className="mt-1 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Bank Transfer / UPI / NEFT</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    Direct transfer to Purvaj Wholesale central account
                  </p>
                </div>
              </label>
            </div>
          </Card>

          {/* Financial Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Price Breakdown
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              {/* GST breakdown */}
              {Object.entries(taxBreakdown).map(([rate, amt]) => (
                <div key={rate} className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>GST ({rate})</span>
                  <span>₹{amt.toFixed(2)}</span>
                </div>
              ))}

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total GST</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{taxTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Wholesale Delivery</span>
                <span>FREE (Central Hub)</span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Grand Total</span>
                <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Warning if credit limit exceeded */}
            {isCreditExceeded && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Credit Limit Exceeded</p>
                  <p className="text-[11px] mt-0.5">
                    Order total of ₹{grandTotal.toFixed(2)} exceeds available credit of ₹{availableCredit.toFixed(2)}. Please choose Cash on Delivery or Bank Transfer.
                  </p>
                </div>
              </div>
            )}

            {/* Place Order CTA Button */}
            <Button
              variant="primary"
              size="lg"
              icon={CheckCircle2}
              disabled={submitting || !isValidForCheckout || isCreditExceeded}
              onClick={handlePlaceOrder}
              className="w-full bg-brand-600 hover:bg-brand-500 font-bold shadow-soft"
            >
              {submitting ? 'Placing Wholesale Order...' : 'Confirm & Place Order'}
            </Button>

            <p className="text-[10px] text-center text-slate-400 mt-2">
              By confirming, a formal B2B GST tax invoice & warehouse dispatch manifest will be generated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopCart;
