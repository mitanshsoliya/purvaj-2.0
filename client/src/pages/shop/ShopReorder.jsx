import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  RefreshCw,
  ShoppingBag,
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShoppingCart,
  Calendar,
  Layers,
  Clock,
  Sparkles
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export const ShopReorder = () => {
  const { loadOrderItemsIntoCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reorder validation modal state
  const [validatingOrder, setValidatingOrder] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    fetchPastOrders();
  }, []);

  const fetchPastOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders?limit=20');
      if (res.data?.success && res.data?.data) {
        setOrders(res.data.data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load past orders', err);
      addToast('Failed to load past orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate Stock, Current Price, and MOQ before reordering
   */
  const handleStartReorder = async (orderSummary) => {
    setIsValidating(true);
    try {
      // 1. Fetch full order details including line items
      const detailRes = await api.get(`/orders/${orderSummary.id}`);
      if (!detailRes.data?.success || !detailRes.data?.data?.order) {
        throw new Error('Failed to fetch order items');
      }
      const fullOrder = detailRes.data.data.order;
      setValidatingOrder(fullOrder);

      // 2. Fetch current catalog prices & inventory stock for all products in this order
      const prodRes = await api.get('/products?limit=100&status=active');
      const liveProducts = prodRes.data?.data?.products || [];
      const prodMap = new Map(liveProducts.map((p) => [p.id, p]));

      let hasPriceChange = false;
      let hasStockIssue = false;
      let hasMoqChange = false;

      const validatedItems = (fullOrder.items || []).map((item) => {
        const live = prodMap.get(item.product_id);
        const oldPrice = parseFloat(item.unit_price || 0);
        const currentPrice = live
          ? parseFloat(live.final_price || live.selling_price || oldPrice)
          : oldPrice;
        const currentStock = live
          ? parseInt(live.available_stock ?? live.current_stock ?? 0, 10)
          : 0;
        const currentMoq = live
          ? parseInt(live.minimum_order_quantity || 1, 10)
          : 1;

        const originalQty = parseInt(item.quantity || 1, 10);
        let adjustedQty = originalQty;

        // MOQ check
        let moqNotice = null;
        if (adjustedQty < currentMoq) {
          adjustedQty = currentMoq;
          hasMoqChange = true;
          moqNotice = `Adjusted to minimum order quantity (${currentMoq})`;
        }

        // Stock check
        let stockNotice = null;
        if (currentStock <= 0) {
          hasStockIssue = true;
          stockNotice = 'Currently Out of Stock';
        } else if (adjustedQty > currentStock) {
          hasStockIssue = true;
          stockNotice = `Only ${currentStock} units available in warehouse`;
          adjustedQty = currentStock;
        }

        // Price change check
        let priceDiff = currentPrice - oldPrice;
        if (Math.abs(priceDiff) > 0.01) {
          hasPriceChange = true;
        }

        return {
          productId: item.product_id,
          name: item.product_name || item.name,
          sku: item.sku,
          image: item.product_image || item.image || live?.image,
          taxRate: parseFloat(item.tax_rate || live?.tax_rate || 0),
          oldPrice,
          currentPrice,
          priceDiff,
          currentStock,
          originalQty,
          adjustedQty,
          moq: currentMoq,
          stockNotice,
          moqNotice,
          isAvailable: currentStock > 0,
        };
      });

      setValidationReport({
        items: validatedItems,
        hasPriceChange,
        hasStockIssue,
        hasMoqChange,
      });
    } catch (err) {
      console.error('Reorder validation failed', err);
      addToast(err.message || 'Failed to validate order items', 'error');
      setValidatingOrder(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmReorder = () => {
    if (!validationReport || !validationReport.items) return;

    const availableItems = validationReport.items.filter((i) => i.isAvailable);
    if (availableItems.length === 0) {
      addToast('No items are currently in stock to reorder', 'error');
      return;
    }

    // Convert to cart items format
    const formattedForCart = availableItems.map((item) => ({
      id: item.productId,
      name: item.name,
      sku: item.sku,
      image: item.image,
      price: item.currentPrice,
      standardPrice: item.currentPrice,
      taxRate: item.taxRate,
      moq: item.moq,
      stock: item.currentStock,
      quantity: item.adjustedQty,
      unit: 'pcs',
    }));

    loadOrderItemsIntoCart(formattedForCart, 'replace');
    setValidatingOrder(null);
    setValidationReport(null);
    addToast('Updated items loaded into wholesale cart!', 'success');
    navigate('/shop/cart');
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500 text-white">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              1-Click Wholesale Reorder
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reorder fast-selling past invoices with automated stock, MOQ, and live wholesale price validation.
          </p>
        </div>

        <Link to="/shop/products">
          <Button variant="secondary" size="sm" icon={Package}>
            Browse Catalog
          </Button>
        </Link>
      </div>

      {/* Past Orders List */}
      <Card title="Past Invoices Ready for Reorder" subtitle="Select any past order to verify stock and price changes">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Past Orders Found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Once you place wholesale orders, you can reorder identical lists with a single tap.
            </p>
            <Link to="/shop/products" className="inline-block mt-4">
              <Button variant="primary" size="sm" icon={Package}>
                Place First Order
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500 transition-all shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-brand-600 dark:text-brand-400">
                      {order.order_number}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    ₹{parseFloat(order.total_amount ?? order.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Payment: <span className="capitalize">{order.payment_method || 'Credit (Udhaar)'}</span> • Status: <span className="capitalize">{order.order_status}</span>
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  disabled={isValidating}
                  onClick={() => handleStartReorder(order)}
                  className="bg-brand-600 hover:bg-brand-500 font-bold shadow-soft self-start sm:self-center"
                >
                  Verify Stock & Reorder ➔
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Reorder Validation & Changes Review Modal */}
      <Modal
        isOpen={!!validationReport}
        onClose={() => setValidationReport(null)}
        title="Review Reorder Changes"
        subtitle={`Verifying stock availability and current wholesale pricing for #${validatingOrder?.order_number}`}
        size="lg"
      >
        {validationReport && (
          <div className="space-y-4">
            {/* Notices Summary Banner */}
            {(validationReport.hasPriceChange || validationReport.hasStockIssue || validationReport.hasMoqChange) ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Updates detected since your previous order:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {validationReport.hasPriceChange && (
                    <li>Some product wholesale rates have updated to current catalog pricing.</li>
                  )}
                  {validationReport.hasStockIssue && (
                    <li>Certain items have limited or zero central warehouse inventory.</li>
                  )}
                  {validationReport.hasMoqChange && (
                    <li>Quantities adjusted to meet minimum order limits (MOQ).</li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>All items are 100% in stock at identical wholesale rates!</span>
              </div>
            )}

            {/* Line items comparison table / cards */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1">
              {validationReport.items.map((item) => (
                <div key={item.productId} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      SKU: {item.sku}
                    </p>

                    {/* Alerts for this line item */}
                    {item.stockNotice && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        {item.stockNotice}
                      </span>
                    )}
                    {item.moqNotice && (
                      <span className="inline-block mt-1 ml-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        {item.moqNotice}
                      </span>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0 space-y-0.5">
                    {/* Quantity */}
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Qty: <span className="font-bold text-slate-900 dark:text-white">{item.adjustedQty}</span>
                    </p>

                    {/* Price with comparison */}
                    <div className="flex items-center gap-1.5 justify-end">
                      {Math.abs(item.priceDiff) > 0.01 && (
                        <span className="text-[10px] text-slate-400 line-through">
                          ₹{item.oldPrice.toFixed(2)}
                        </span>
                      )}
                      <span className={`font-bold ${item.priceDiff > 0 ? 'text-amber-600' : item.priceDiff < 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                        ₹{item.currentPrice.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                      ₹{(item.currentPrice * item.adjustedQty).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setValidationReport(null)}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="md"
                icon={ShoppingCart}
                onClick={handleConfirmReorder}
                className="bg-brand-600 hover:bg-brand-500 font-bold shadow-soft"
              >
                Accept & Proceed to Checkout ➔
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ShopReorder;
