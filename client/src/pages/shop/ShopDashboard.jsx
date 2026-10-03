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
  Percent,
  Download,
  Sparkles,
  BoxesIcon,
  IndianRupee
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { PageSkeleton } from '../../components/common/Skeleton';
import OrderProgressTracker from '../../components/orders/OrderProgressTracker';
import { useSocket } from '../../context/SocketContext';
import { getImageUrl } from '../../utils/imageUrl';

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

  const { socket } = useSocket();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time automatic updates when Admin updates order status
  useEffect(() => {
    const handleLiveOrderUpdate = (event) => {
      const data = event.detail || event;
      if (!data) return;

      const orderId = data.orderId || data.id;
      const orderNum = data.orderNumber || data.order_number;
      const newStatus = (data.newStatus || data.orderStatus || data.status || data.deliveryStatus || '').toLowerCase();

      // Update recentOrders in place
      setRecentOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId || o.order_number === orderNum) {
            return {
              ...o,
              order_status: newStatus || o.order_status,
              delivery_status: data.deliveryStatus || o.delivery_status,
              driver_name: data.driverName || o.driver_name,
              driver_mobile: data.driverMobile || o.driver_mobile,
              vehicle_number: data.vehicleNumber || o.vehicle_number,
              confirmed_at: data.confirmedAt || (newStatus === 'confirmed' ? new Date().toISOString() : o.confirmed_at),
              dispatched_at: data.dispatchedAt || (newStatus === 'dispatched' ? new Date().toISOString() : o.dispatched_at),
              delivered_at: data.deliveredAt || (newStatus === 'delivered' ? new Date().toISOString() : o.delivered_at),
              updated_at: data.updatedAt || new Date().toISOString(),
            };
          }
          return o;
        })
      );

      // Refresh dashboard KPI stats
      fetchDashboardData();
    };

    window.addEventListener('purvaj:order-updated', handleLiveOrderUpdate);

    if (socket) {
      socket.on('shop_order_updated', handleLiveOrderUpdate);
      socket.on('order_status_changed', handleLiveOrderUpdate);
      socket.on('delivery_status_changed', handleLiveOrderUpdate);
      socket.on('shop_order_created', handleLiveOrderUpdate);
    }

    return () => {
      window.removeEventListener('purvaj:order-updated', handleLiveOrderUpdate);
      if (socket) {
        socket.off('shop_order_updated', handleLiveOrderUpdate);
        socket.off('order_status_changed', handleLiveOrderUpdate);
        socket.off('delivery_status_changed', handleLiveOrderUpdate);
        socket.off('shop_order_created', handleLiveOrderUpdate);
      }
    };
  }, [socket]);

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

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'delivered': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800';
      case 'dispatched': return 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800';
      case 'processing': return 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800';
      case 'confirmed': return 'text-brand-700 bg-brand-50 border-brand-200 dark:bg-brand-950/50 dark:text-brand-400 dark:border-brand-800';
      case 'cancelled': return 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800';
      default: return 'text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'delivered': return 'Delivered';
      case 'dispatched': return 'Shipped';
      case 'processing': return 'Processing';
      case 'confirmed': return 'Confirmed';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: Offer Banner (matching reference - yellow/blue gradient)
          ═══════════════════════════════════════════════════════════════ */}
      {offers.length > 0 ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-brand-500 to-sky-500 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-50" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <p className="text-yellow-200 text-xs font-bold uppercase tracking-wider">नया ऑफर!</p>
                <p className="text-white text-sm sm:text-base font-bold mt-0.5">
                  {offers[0].title || 'Diwali Bulk Sale starts now!'} 
                  {offers[0].discount_type === 'percentage' 
                    ? ` Up to ${parseFloat(offers[0].discount_value)}% off on bulk orders.`
                    : ` ₹${parseFloat(offers[0].discount_value)} OFF!`}
                </p>
              </div>
            </div>
            <Link to="/shop/offers" className="flex-shrink-0">
              <button className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold text-xs rounded-lg shadow-md transition-all hover:shadow-lg active:scale-95 uppercase tracking-wide">
                [CLAIM NOW]
              </button>
            </Link>
          </div>
        </div>
      ) : (
        /* Default welcome banner if no offers */
        <div className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-brand-950 text-white rounded-2xl p-5 sm:p-6 shadow-soft-lg border border-navy-800">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  Verified Retailer
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {user?.shopName || user?.shop?.shop_name || 'Wholesale Partner'}
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                Same-Day Central Warehouse Dispatch Available
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <Link to="/shop/quick-order">
                <Button variant="primary" size="md" icon={Zap} className="bg-brand-600 hover:bg-brand-500 shadow-soft">
                  Quick Order
                </Button>
              </Link>
              <Link to="/shop/cart">
                <Button variant="secondary" size="md" icon={ShoppingCart} className="bg-slate-800/80 hover:bg-slate-700 text-white border-slate-700">
                  Cart ({cartCount})
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: Product Grid (matching reference - product cards with ADD BOX TO CART)
          ═══════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Wholesale Products
          </h2>
          <Link to="/shop/products" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {frequentProducts.slice(0, 4).map((p) => {
            const applicablePrice = parseFloat(p.final_price || p.selling_price || 0);
            const mrpPrice = parseFloat(p.mrp || p.standard_price || applicablePrice);
            const moq = parseInt(p.minimum_order_quantity || 1, 10);
            const stock = parseInt(p.available_stock ?? p.current_stock ?? 100, 10);
            const hasDiscount = applicablePrice < mrpPrice;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft hover:shadow-soft-md transition-all group"
              >
                {/* Product Image */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img
                      src={getImageUrl(p.image)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    </div>
                  )}
                  {hasDiscount && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-600 text-white shadow-sm">
                      {Math.round(((mrpPrice - applicablePrice) / mrpPrice) * 100)}% OFF
                    </span>
                  )}
                  {stock <= 10 && stock > 0 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-white shadow-sm">
                      {stock} left
                    </span>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 sm:p-3.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-1">
                    {p.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Box of {moq > 1 ? moq : 10}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      ₹{applicablePrice.toFixed(0)}
                    </span>
                    {hasDiscount && (
                      <span className="text-[11px] text-slate-400 line-through">
                        ₹{mrpPrice.toFixed(0)}
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addItem(p, moq);
                    }}
                    className="mt-3 w-full py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 uppercase tracking-wide"
                    aria-label={`Add ${p.name} to cart`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    ADD BOX TO CART
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: My Recent Orders (matching reference - table with status badges)
          ═══════════════════════════════════════════════════════════════ */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-brand-500" />
              <span>MY RECENT ORDERS</span>
            </h2>
          </div>
          <Link to="/shop/orders" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            View All
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8 text-center">
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
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-brand-50/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => navigate('/shop/orders')}
                    >
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 dark:text-white font-semibold">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {order.payment_method === 'credit' ? 'Credit delivery' : 'Order delivery'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(order.total_amount ?? order.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadgeColor(order.order_status)}`}>
                          {getStatusLabel(order.order_status)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-brand-600 dark:text-brand-400 hover:underline text-xs font-semibold cursor-pointer flex items-center gap-1 justify-end">
                          View Details
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to="/shop/orders"
                  className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                        {order.order_number}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadgeColor(order.order_status)}`}>
                      {getStatusLabel(order.order_status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      ₹{parseFloat(order.total_amount ?? order.total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-0.5">
                      View Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Live Order Progress Tracker */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <OrderProgressTracker order={order} variant="compact" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Download Invoice Link */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center">
              <Link
                to="/shop/bills"
                className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                DOWNLOAD INVOICE
              </Link>
            </div>
          </>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: Quick Actions + Credit Info
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/shop/products"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-500 hover:shadow-soft-md transition-all group"
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
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-500 hover:shadow-soft-md transition-all group"
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
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-500 hover:shadow-soft-md transition-all group"
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
              className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft hover:border-brand-500 hover:shadow-soft-md transition-all group"
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

        {/* Credit Standing Card */}
        <Card className="p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <IndianRupee className="w-4 h-4 text-brand-500" />
            <span>Credit Standing</span>
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Credit Limit</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                ₹{stats.creditLimit.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Outstanding (Udhaar)</span>
              <span className={`text-sm font-extrabold ${stats.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                ₹{stats.outstanding.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Available Credit</span>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                ₹{stats.availableCredit.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Credit usage progress bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Usage</span>
                <span>{((stats.outstanding / Math.max(stats.creditLimit, 1)) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (stats.outstanding / stats.creditLimit) > 0.8
                      ? 'bg-rose-500'
                      : (stats.outstanding / stats.creditLimit) > 0.5
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (stats.outstanding / Math.max(stats.creditLimit, 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShopDashboard;
