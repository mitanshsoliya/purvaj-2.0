import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  ShoppingCart,
  Receipt,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  Plus,
  Minus,
  RefreshCw,
  Search,
  ChevronRight,
  CreditCard,
  Download,
  IndianRupee,
  Bell,
  ArrowRight,
  Phone,
  Check,
  Filter,
  Sparkles,
  Layers,
  FileText,
  BadgePercent
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
  const { addItem, cartCount, grandTotal } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    outstanding: 0,
    creditLimit: 250000,
    availableCredit: 250000,
    lastPurchase: null,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [offers, setOffers] = useState([]);
  const [cardQuantities, setCardQuantities] = useState({});
  const [addedFeedback, setAddedFeedback] = useState({});

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

      // Refresh dashboard KPI stats silently
      fetchDashboardData(true);
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

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [ordersRes, productsRes, categoriesRes, offersRes, shopRes] = await Promise.allSettled([
        api.get('/orders?limit=15'),
        api.get('/products?limit=60&status=active'),
        api.get('/categories'),
        api.get('/offers?active_only=true'),
        api.get('/shops/profile'),
      ]);

      let ordersList = [];
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.data) {
        ordersList = ordersRes.value.data.data.orders || [];
        setRecentOrders(ordersList.slice(0, 6));
      }

      let prodsList = [];
      if (productsRes.status === 'fulfilled' && productsRes.value.data?.data) {
        prodsList = productsRes.value.data.data.products || [];
        setProducts(prodsList);
      }

      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.data?.data) {
        const loadedCats = categoriesRes.value.data.data.categories || [];
        setCategories(loadedCats);
      } else if (prodsList.length > 0) {
        // Derive categories from product items if category endpoint isn't populated
        const distinct = Array.from(new Set(prodsList.map(p => p.category_name || p.category?.name || p.category).filter(Boolean)));
        setCategories(distinct.map(name => ({ id: name, name })));
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
        (o) => o.order_status === 'pending' || o.order_status === 'processing' || o.order_status === 'confirmed'
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
      setRefreshing(false);
    }
  };

  const handleQtyChange = (productId, delta) => {
    setCardQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleAddToCart = (product) => {
    const boxCount = cardQuantities[product.id] || 1;
    const moq = parseInt(product.minimum_order_quantity || 1, 10);
    const totalUnits = boxCount * moq;

    addItem(product, totalUnits);

    // Visual button confirmation animation
    setAddedFeedback((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedFeedback((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
      case 'dispatched':
      case 'shipped':
        return 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800';
      case 'processing':
      case 'packed':
        return 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
      case 'confirmed':
        return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800';
      case 'cancelled':
        return 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'Delivered';
      case 'dispatched':
      case 'shipped': return 'Shipped';
      case 'processing': return 'Processing';
      case 'packed': return 'Packed';
      case 'confirmed': return 'Confirmed';
      case 'cancelled': return 'Cancelled';
      default: return 'Pending';
    }
  };

  // Find active ongoing order for live tracking
  const activeOrder = recentOrders.find((o) =>
    ['pending', 'confirmed', 'processing', 'packed', 'dispatched'].includes(o.order_status?.toLowerCase())
  );

  // Filtered products for catalog grid
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'all') {
      const pCatId = String(p.category_id || p.category?.id || '');
      const pCatName = String(p.category_name || p.category?.name || p.category || '').toLowerCase();
      const target = String(selectedCategory).toLowerCase();
      if (pCatId !== target && !pCatName.includes(target)) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const skuMatch = (p.sku || '').toLowerCase().includes(q);
      const brandMatch = (p.brand_name || p.brand?.name || '').toLowerCase().includes(q);
      if (!nameMatch && !skuMatch && !brandMatch) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return <PageSkeleton />;
  }

  const shopName = user?.shop?.shop_name || user?.name || 'Retailer Store';
  const activeOffer = offers.length > 0 ? offers[0] : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER: Retailer Bar & Live Cart Summary
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 text-lg">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {shopName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                B2B Verified Retailer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Wholesale Order Portal • Connected to Purvaj Central Depot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Live Sync Button */}
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60"
            title="Sync live order status and wholesale catalog"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Quick Cart Pill */}
          <Link
            to="/shop/cart"
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/20 transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cart</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white text-blue-700 text-[10px] font-black">
              {cartCount}
            </span>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: Offer Banner (Direct Match with Reference Photo)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-200 via-amber-100 to-yellow-200 dark:from-amber-950/70 dark:via-amber-900/50 dark:to-yellow-950/60 border-2 border-amber-300 dark:border-amber-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md font-black">
              <Bell className="w-5 h-5 fill-slate-950 text-slate-950 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-950 dark:text-amber-300 text-xs font-black uppercase tracking-wider">
                  नया ऑफर!
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                  Active Wholesale Deal
                </span>
              </div>
              <p className="text-slate-950 dark:text-white text-xs sm:text-sm font-black mt-0.5">
                {activeOffer?.description
                  ? `Wholesale: '${activeOffer.title} - ${activeOffer.description}'`
                  : "Wholesale: 'Diwali Bulk Sale starts now! Up to 25% off on bulk orders.'"}
              </p>
            </div>
          </div>
          <Link to="/shop/offers" className="flex-shrink-0">
            <button className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all uppercase tracking-wider flex items-center justify-center gap-1.5">
              <span>[CLAIM NOW]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: Main 2-Column Split Layout (Matching Reference Mockup)
          Left 2/3: Wholesale Products Catalog Grid
          Right 1/3: Recent Orders, Live Delivery Tracker & Khata Widget
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ───────────────────────────────────────────────────────────
            LEFT COLUMN (8 cols): Wholesale Product Catalog Grid
            ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          {/* Catalog Controls Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>Wholesale Product Catalog</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {filteredProducts.length} items
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Order wholesale cartons directly with guaranteed same-day dispatch
                </p>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Category Filter Pills (Horizontal scrollable) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Products
              </button>
              {categories.map((cat) => {
                const catKey = cat.id || cat.name;
                const isActive = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid (3 columns on desktop, matching reference image) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center shadow-sm">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Wholesale Products Found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No matching items found for category or search filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.slice(0, 9).map((p) => {
                const applicablePrice = parseFloat(p.final_price || p.selling_price || 0);
                const mrpPrice = parseFloat(p.mrp || p.standard_price || applicablePrice);
                const moq = parseInt(p.minimum_order_quantity || 1, 10);
                const stock = parseInt(p.available_stock ?? p.current_stock ?? 100, 10);
                const hasDiscount = mrpPrice > applicablePrice && applicablePrice > 0;
                const discountPercent = hasDiscount ? Math.round(((mrpPrice - applicablePrice) / mrpPrice) * 100) : 0;
                const isAdded = !!addedFeedback[p.id];
                const qtyVal = cardQuantities[p.id] || 1;

                return (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 flex flex-col group"
                  >
                    {/* Product Image Area */}
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-800">
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
                        <div className="text-center p-4">
                          <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                        </div>
                      )}

                      {/* Badges on Image */}
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                        {discountPercent > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-600 text-white shadow-sm">
                            {discountPercent}% OFF
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-900/80 backdrop-blur-sm text-white shadow-sm">
                          Wholesale
                        </span>
                      </div>

                      {stock <= 15 && stock > 0 && (
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500 text-white shadow-sm">
                          {stock} left
                        </span>
                      )}
                    </div>

                    {/* Product Body */}
                    <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {p.name}
                        </h3>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                          <span>Box of {moq > 1 ? moq : 10}</span>
                          {p.sku && <span className="font-mono text-[10px] text-slate-400">SKU: {p.sku}</span>}
                        </div>
                      </div>

                      {/* Price & Quantity Stepper */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                ₹{applicablePrice.toFixed(0)}
                              </span>
                              {hasDiscount && (
                                <span className="text-xs text-slate-400 line-through">
                                  ₹{mrpPrice.toFixed(0)}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block -mt-0.5">per unit / box</span>
                          </div>

                          {/* Stepper [-] [1] [+] */}
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 shadow-sm">
                            <button
                              type="button"
                              onClick={() => handleQtyChange(p.id, -1)}
                              className="px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-black text-xs transition-colors"
                              title="Decrease boxes"
                            >
                              -
                            </button>
                            <span className="px-2 py-1 text-xs font-black text-slate-900 dark:text-white min-w-[24px] text-center bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-700">
                              {qtyVal}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(p.id, 1)}
                              className="px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-black text-xs transition-colors"
                              title="Increase boxes"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Royal Blue Action Button: ADD BOX TO CART */}
                        <button
                          type="button"
                          onClick={() => handleAddToCart(p)}
                          className={`w-full py-2.5 px-3 text-xs font-black rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 uppercase tracking-wide ${
                            isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                          }`}
                          aria-label={`Add ${p.name} to cart`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Added to Cart!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>ADD BOX TO CART</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Catalog Footer: View All link */}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Looking for more products or special bulk FMCG inventory?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Browse our complete wholesale master catalog with detailed tax rates and HSN codes.
              </p>
            </div>
            <Link to="/shop/products" className="flex-shrink-0">
              <Button variant="primary" size="sm" icon={Package}>
                View Full Catalog ({products.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            RIGHT COLUMN (4 cols): Orders, Live Dispatch & Khata
            ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">
          {/* ═══════════════════════════════════════════════════════════
              WIDGET 1: MY RECENT ORDERS (Direct Match with Reference Image)
              ═══════════════════════════════════════════════════════════ */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <h2 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>MY RECENT ORDERS</span>
              </h2>
              <Link
                to="/shop/orders"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                View All
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-6 text-center">
                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Orders Placed Yet</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Add wholesale boxes to cart and place your order.
                </p>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {recentOrders.map((order) => {
                    const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    const orderTotal = parseFloat(order.total_amount ?? order.total ?? 0);

                    return (
                      <div
                        key={order.id}
                        onClick={() => navigate('/shop/orders')}
                        className="p-3.5 hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div>
                            <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs">
                              {order.order_number}
                            </span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              {formattedDate}
                            </span>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeColor(
                              order.order_status
                            )}`}
                          >
                            {getStatusLabel(order.order_status)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                            {order.payment_method === 'credit' ? 'Udhaar / Credit' : 'Cash on Delivery'}
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">
                            ₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Download Invoice Link (Matching Reference Image) */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center">
                  <Link
                    to="/shop/bills"
                    className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1.5 uppercase tracking-wide"
                  >
                    <Download className="w-3.5 h-3.5 text-rose-500" />
                    <span>DOWNLOAD INVOICE</span>
                    <FileText className="w-3.5 h-3.5 text-blue-600 ml-0.5" />
                  </Link>
                </div>
              </div>
            )}
          </Card>

          {/* ═══════════════════════════════════════════════════════════
              WIDGET 2: Active Order Live Delivery Tracker
              ═══════════════════════════════════════════════════════════ */}
          {activeOrder && (
            <Card className="p-4 sm:p-5 border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
                  </span>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Live Delivery Dispatch
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                  {activeOrder.order_number}
                </span>
              </div>

              {/* Progress tracker */}
              <div className="mb-3">
                <OrderProgressTracker order={activeOrder} variant="compact" />
              </div>

              {/* Driver & Vehicle Details if available */}
              {(activeOrder.driver_name || activeOrder.vehicle_number) && (
                <div className="pt-2.5 mt-2.5 border-t border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                        {activeOrder.driver_name || 'Purvaj Logistics Driver'}
                      </p>
                      {activeOrder.vehicle_number && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          {activeOrder.vehicle_number}
                        </p>
                      )}
                    </div>
                  </div>
                  {activeOrder.driver_mobile && (
                    <a
                      href={`tel:${activeOrder.driver_mobile}`}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════════════
              WIDGET 3: Credit Standing & Khata (उधार)
              ═══════════════════════════════════════════════════════════ */}
          <Card className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>Credit Standing (खाता)</span>
              </h3>
              <Link
                to="/shop/payments"
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                View Ledger
              </Link>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approved Credit Limit</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  ₹{stats.creditLimit.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Outstanding (Udhaar)</span>
                <span className={`text-xs font-black ${stats.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                  ₹{stats.outstanding.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Available Credit Balance</span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                  ₹{stats.availableCredit.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Credit usage meter */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Credit Utilized</span>
                  <span className="font-bold">
                    {((stats.outstanding / Math.max(stats.creditLimit, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.outstanding / stats.creditLimit > 0.8
                        ? 'bg-rose-500'
                        : stats.outstanding / stats.creditLimit > 0.5
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (stats.outstanding / Math.max(stats.creditLimit, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <Link
              to="/shop/payments"
              className="mt-3.5 block w-full text-center py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Pay Balance / View Khata Statement
            </Link>
          </Card>

          {/* ═══════════════════════════════════════════════════════════
              WIDGET 4: Quick Actions
              ═══════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/shop/reorder"
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-4 h-4" />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white">1-Click Reorder</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Repeat past stock</p>
            </Link>

            <Link
              to="/shop/bills"
              className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-center group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Tax Invoices</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Download GST bills</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopDashboard;
