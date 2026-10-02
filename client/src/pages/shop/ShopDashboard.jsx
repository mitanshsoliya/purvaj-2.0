import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  Zap,
  ShoppingCart,
  Receipt,
  Scale,
  Gift,
  ArrowRight,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  CreditCard,
  Percent
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { PageSkeleton } from '../../components/common/Skeleton';

export const ShopDashboard = () => {
  const { user } = useAuth();
  const { addItem, cartCount } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    outstanding: 0,
    creditLimit: 250000,
    availableCredit: 250000,
    lastPurchase: null,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [frequentProducts, setFrequentProducts] = useState([]);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Orders to derive order count, pending, last purchase
      const [ordersRes, productsRes, offersRes, shopRes] = await Promise.allSettled([
        api.get('/orders?limit=10'),
        api.get('/products?limit=8'),
        api.get('/offers?active_only=true'),
        api.get('/shops/profile'),
      ]);

      let ordersList = [];
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.data) {
        ordersList = ordersRes.value.data.data.orders || [];
        setRecentOrders(ordersList.slice(0, 4));
      }

      if (productsRes.status === 'fulfilled' && productsRes.value.data?.data) {
        setFrequentProducts(productsRes.value.data.data.products || []);
      }

      if (offersRes.status === 'fulfilled' && offersRes.value.data?.data) {
        setOffers(offersRes.value.data.data.offers || []);
      }

      let creditLimit = 250000;
      let creditUsed = 0;
      if (shopRes.status === 'fulfilled' && shopRes.value.data?.data?.shop) {
        const s = shopRes.value.data.data.shop;
        creditLimit = parseFloat(s.credit_limit || 250000);
        creditUsed = parseFloat(s.credit_used || 0);
      } else if (user?.shop) {
        creditLimit = parseFloat(user.shop.credit_limit || 250000);
        creditUsed = parseFloat(user.shop.credit_used || 0);
      }

      const pendingCount = ordersList.filter(
        (o) => o.order_status === 'pending' || o.order_status === 'processing'
      ).length;

      const lastPurchase = ordersList.length > 0 ? ordersList[0] : null;

      setStats({
        totalOrders: ordersList.length,
        pendingOrders: pendingCount,
        outstanding: creditUsed,
        creditLimit,
        availableCredit: Math.max(0, creditLimit - creditUsed),
        lastPurchase,
      });
    } catch (err) {
      console.error('Failed to load shop dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="success">Delivered</Badge>;
      case 'dispatched':
        return <Badge variant="info">Dispatched</Badge>;
      case 'processing':
        return <Badge variant="warning">Packing</Badge>;
      case 'confirmed':
        return <Badge variant="brand">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">Pending</Badge>;
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Header Banner: Shop Info, GSTIN, & Credit Standing */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-brand-950 text-white rounded-2xl p-5 sm:p-6 shadow-soft-lg border border-navy-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                Verified Retailer
              </span>
              <span className="text-xs text-slate-400 font-mono">
                GSTIN: {user?.gstin || user?.shop?.gstin || '24AAACP1234M1Z2'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {user?.shopName || user?.shop?.shop_name || 'Shree Krishna Traders'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-1.5">
              <span>Wholesale Partner</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Same-Day Central Warehouse Dispatch</span>
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link to="/shop/quick-order" className="flex-1 sm:flex-none">
              <Button
                variant="primary"
                size="md"
                icon={Zap}
                className="w-full bg-brand-600 hover:bg-brand-500 font-semibold shadow-soft"
              >
                Quick Order
              </Button>
            </Link>
            <Link to="/shop/cart" className="flex-1 sm:flex-none">
              <Button
                variant="secondary"
                size="md"
                icon={ShoppingCart}
                className="w-full bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700"
              >
                Cart ({cartCount})
              </Button>
            </Link>
          </div>
        </div>

        {/* Financial KPI bar */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-medium">
              Credit Limit
            </span>
            <span className="text-base sm:text-lg font-bold text-white mt-0.5 block">
              ₹{stats.creditLimit.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-medium">
              Outstanding Udhaar
            </span>
            <span className={`text-base sm:text-lg font-bold mt-0.5 block ${stats.outstanding > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              ₹{stats.outstanding.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-medium">
              Available Credit
            </span>
            <span className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 block">
              ₹{stats.availableCredit.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-medium">
              Last Purchase
            </span>
            <span className="text-sm sm:text-base font-bold text-brand-300 mt-0.5 block truncate">
              {stats.lastPurchase
                ? `₹${parseFloat(stats.lastPurchase.total_amount).toLocaleString('en-IN')}`
                : 'No orders yet'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">My Orders</span>
            <Package className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalOrders}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Total placed</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.pendingOrders}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">In dispatch pipeline</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Outstanding</span>
            <Scale className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
            ₹{stats.outstanding.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Due for payment</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Last Purchase</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1 truncate">
            {stats.lastPurchase
              ? new Date(stats.lastPurchase.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })
              : 'None'}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {stats.lastPurchase ? `#${stats.lastPurchase.order_number}` : 'Start ordering'}
          </span>
        </div>
      </div>

      {/* 3. Mobile-First Quick Actions Bar */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/shop/products"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-500 transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">New Order</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Wholesale catalog</p>
            </div>
          </Link>

          <Link
            to="/shop/reorder"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-500 transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">1-Click Reorder</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Past invoices</p>
            </div>
          </Link>

          <Link
            to="/shop/bills"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-500 transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">My Bills</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">GST tax invoices</p>
            </div>
          </Link>

          <Link
            to="/shop/payments"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-500 transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Payments</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">History & balance</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. Active Offers Banner */}
      {offers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                <Gift className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Exclusive Schemes For Your Store
              </h2>
            </div>
            <Link to="/shop/offers" className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline">
              View All ({offers.length})
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {offers.slice(0, 2).map((offer) => (
              <div
                key={offer.id}
                className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-500/20 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      {offer.discount_type === 'percentage'
                        ? `${parseFloat(offer.discount_value)}% OFF`
                        : `₹${parseFloat(offer.discount_value)} OFF`}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {offer.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Min order ₹{parseFloat(offer.minimum_order_value || 0).toLocaleString('en-IN')} • Ends{' '}
                    {new Date(offer.end_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <Link to="/shop/products">
                  <Button variant="ghost" size="sm" className="text-xs text-amber-600 font-semibold">
                    Shop Now
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Frequently Ordered Products (Fast Re-supply) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Frequently Ordered Fast-Movers
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your applicable wholesale rates with MOQ & live warehouse inventory
            </p>
          </div>
          <Link to="/shop/products" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {frequentProducts.slice(0, 4).map((p) => {
            const applicablePrice = parseFloat(p.final_price || p.selling_price || 0);
            const standardPrice = parseFloat(p.standard_price || p.selling_price || applicablePrice);
            const hasSpecialPrice = applicablePrice < standardPrice;
            const moq = parseInt(p.minimum_order_quantity || 1, 10);
            const stock = parseInt(p.available_stock ?? p.current_stock ?? 100, 10);

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between hover:shadow-soft transition-all group"
              >
                <div>
                  <div className="relative w-full aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 mb-2 overflow-hidden flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-400" />
                    )}
                    {hasSpecialPrice && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                        Special Rate
                      </span>
                    )}
                    {stock <= 10 && stock > 0 && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-600 text-white">
                        {stock} left
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 block truncate">
                    SKU: {p.sku}
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 mt-0.5">
                    {p.name}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        ₹{applicablePrice.toFixed(2)}
                      </span>
                      {hasSpecialPrice && (
                        <span className="text-[10px] text-slate-400 line-through">
                          ₹{standardPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      MOQ: {moq} {p.unit || 'pcs'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => addItem(p, moq)}
                    className="p-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-soft transition-transform active:scale-95"
                    aria-label={`Add ${p.name} to cart`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Recent Orders Table / Card List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Wholesale Orders
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live fulfillment status from Purvaj Central Warehouse
            </p>
          </div>
          <Link to="/shop/orders" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            <span>View All Orders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Orders Placed Yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Place your first wholesale stock order today. Orders confirmed before 2 PM are dispatched same-day.
            </p>
            <Link to="/shop/products" className="inline-block mt-4">
              <Button variant="primary" size="sm" icon={Package}>
                Start New Order
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to={`/shop/orders`}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:border-brand-500 transition-all shadow-soft flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold font-mono text-brand-600 dark:text-brand-400">
                    {order.order_number}
                  </span>
                  {getStatusBadge(order.order_status)}
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Bill:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment:</span>
                    <span className="capitalize font-medium text-slate-700 dark:text-slate-200">
                      {order.payment_method || 'Credit (Udhaar)'} ({order.payment_status})
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-brand-600 dark:text-brand-400 font-semibold">
                  <span>View Details & Invoice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopDashboard;
