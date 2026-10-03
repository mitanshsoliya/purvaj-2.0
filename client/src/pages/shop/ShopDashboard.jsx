import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Receipt,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Plus,
  Minus,
  RefreshCw,
  Search,
  ChevronRight,
  IndianRupee,
  Bell,
  Sparkles,
  Download,
  CreditCard,
  Check,
  ShieldCheck,
  Store,
  Phone,
  Tag,
  ArrowRight,
  SlidersHorizontal,
  X,
  ExternalLink,
  Printer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { PageSkeleton } from '../../components/common/Skeleton';
import { getImageUrl } from '../../utils/imageUrl';

// High-grade fallback wholesale catalog if DB has few items
const SAMPLE_WHOLESALE_PRODUCTS = [
  {
    id: 'sample-p1',
    name: 'Balaji Wafers Cream & Onion Family Pack',
    category_id: 'cat-snacks',
    category_name: 'Snacks & Namkeen',
    selling_price: 150,
    mrp: 180,
    moq: 10,
    packaging: 'Box of 10',
    current_stock: 45,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'sample-p2',
    name: 'Parle-G Gold Glucose Biscuits Bulk Carton',
    category_id: 'cat-bakery',
    category_name: 'Bakery & Biscuits',
    selling_price: 250,
    mrp: 300,
    moq: 10,
    packaging: 'Box of 10',
    current_stock: 80,
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'sample-p3',
    name: 'Tata Tea Gold Leaf 1kg Wholesale Pack',
    category_id: 'cat-beverages',
    category_name: 'Tea & Beverages',
    selling_price: 465,
    mrp: 520,
    moq: 6,
    packaging: 'Box of 6',
    current_stock: 28,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'sample-p4',
    name: 'Amul Pure Ghee 1L Tin Wholesale Case',
    category_id: 'cat-dairy',
    category_name: 'Dairy & Ghee',
    selling_price: 610,
    mrp: 660,
    moq: 12,
    packaging: 'Box of 12',
    current_stock: 19,
    image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'sample-p5',
    name: 'Everest Garam Masala 100g Retail Pack Case',
    category_id: 'cat-spices',
    category_name: 'Spices & Masala',
    selling_price: 170,
    mrp: 200,
    moq: 10,
    packaging: 'Box of 10',
    current_stock: 64,
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'sample-p6',
    name: 'Haldiram Soan Papdi 500g Festival Gift Box',
    category_id: 'cat-sweets',
    category_name: 'Sweets & Gifts',
    selling_price: 290,
    mrp: 350,
    moq: 8,
    packaging: 'Box of 8',
    current_stock: 35,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  }
];

export const ShopDashboard = () => {
  const { user } = useAuth();
  const { addItem, cartCount, grandTotal } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    outstanding: 0,
    creditLimit: 250000,
    availableCredit: 250000,
    lastPurchase: null,
  });
  const [shopProfile, setShopProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stepper quantity per card
  const [cardQuantities, setCardQuantities] = useState({});
  // Button temporary "Added!" visual state
  const [addedState, setAddedState] = useState({});

  // Offer modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Quick Invoice Preview Modal
  const [previewOrder, setPreviewOrder] = useState(null);

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

      setRecentOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId || o.order_number === orderNum) {
            return {
              ...o,
              order_status: newStatus || o.order_status,
              delivery_status: data.deliveryStatus || o.delivery_status,
              updated_at: new Date().toISOString(),
            };
          }
          return o;
        })
      );

      // Re-fetch stats
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
      const [ordersRes, prodsRes, catsRes, shopRes] = await Promise.allSettled([
        api.get('/orders?limit=10'),
        api.get('/products?limit=24'),
        api.get('/categories'),
        api.get('/shops/profile'),
      ]);

      // Orders
      let ordersList = [];
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.data) {
        ordersList = ordersRes.value.data.data.orders || [];
        setRecentOrders(ordersList.slice(0, 5));
      }

      // Products
      let loadedProducts = [];
      if (prodsRes.status === 'fulfilled' && prodsRes.value.data?.data) {
        loadedProducts = prodsRes.value.data.data.products || [];
      }
      if (loadedProducts.length === 0) {
        loadedProducts = SAMPLE_WHOLESALE_PRODUCTS;
      }
      setProducts(loadedProducts);

      // Categories
      if (catsRes.status === 'fulfilled' && catsRes.value.data?.data) {
        setCategories(catsRes.value.data.data.categories || []);
      }

      // Shop Profile & Credit
      let creditLimit = 250000;
      let creditUsed = 0;
      let profileObj = null;

      if (shopRes.status === 'fulfilled' && shopRes.value.data?.data?.shop) {
        profileObj = shopRes.value.data.data.shop;
        creditLimit = parseFloat(profileObj.credit_limit || 250000);
        creditUsed = parseFloat(profileObj.credit_used || 0);
        setShopProfile(profileObj);
      } else if (user?.shop) {
        profileObj = user.shop;
        creditLimit = parseFloat(user.shop.credit_limit || 250000);
        creditUsed = parseFloat(user.shop.credit_used || 0);
        setShopProfile(profileObj);
      }

      const pendingCount = ordersList.filter(
        (o) => o.order_status === 'pending' || o.order_status === 'processing' || o.order_status === 'confirmed' || o.order_status === 'dispatched'
      ).length;

      setStats({
        totalOrders: ordersList.length,
        pendingOrders: pendingCount,
        outstanding: creditUsed,
        creditLimit,
        availableCredit: Math.max(0, creditLimit - creditUsed),
        lastPurchase: ordersList.length > 0 ? ordersList[0] : null,
      });
    } catch (err) {
      console.error('Failed to load shop dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter products by selected category and live search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === 'all' ||
        p.category_id === selectedCategory ||
        p.category_name?.toLowerCase().includes(selectedCategory.toLowerCase());

      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query);

      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleQuantityChange = (productId, delta) => {
    setCardQuantities((prev) => {
      const current = prev[productId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const handleAddToCart = (product) => {
    const boxes = cardQuantities[product.id] || 1;
    const moq = parseInt(product.minimum_order_quantity || product.moq || 1, 10);
    // Add total units = boxes * moq
    const totalUnits = boxes * moq;

    addItem(product, totalUnits);

    // Trigger visual feedback
    setAddedState((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedState((prev) => ({ ...prev, [product.id]: false }));
    }, 1200);

    if (addToast) {
      addToast({
        title: 'Added to Wholesale Cart',
        message: `${boxes} Box (${totalUnits} pcs) of ${product.name}`,
        type: 'success',
      });
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'delivered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
            Delivered
          </span>
        );
      case 'dispatched':
      case 'shipped':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800">
            Shipped
          </span>
        );
      case 'processing':
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800">
            Processing
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            Pending
          </span>
        );
    }
  };

  const handleCopyCoupon = () => {
    navigator.clipboard?.writeText('PURVAJ25');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    if (addToast) {
      addToast({
        title: 'Coupon Copied!',
        message: 'Use code PURVAJ25 at checkout for 25% bulk discount',
        type: 'success',
      });
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const shopName = shopProfile?.shop_name || user?.shop?.shop_name || 'Retailer Shop';
  const ownerName = shopProfile?.owner_name || user?.full_name || 'Partner Store';
  const city = shopProfile?.city || 'Gujarat';

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: Retailer Identity & Dispatch Status Strip
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md font-black text-lg">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {shopName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified Retailer
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{ownerName}</span>
              <span>•</span>
              <span>{city}</span>
              <span>•</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Order before 2 PM for Same-Day Dispatch
              </span>
            </p>
          </div>
        </div>

        {/* Quick Cart Status Link */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            to="/shop/cart"
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs shadow-sm transition-all"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span>Current Cart:</span>
            <span className="font-extrabold text-blue-900 dark:text-blue-200">
              ₹{grandTotal ? grandTotal.toLocaleString('en-IN') : '0.00'}
            </span>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: Golden Wholesale Offer Banner (Matching Reference Image)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-200 via-amber-100 to-yellow-200 dark:from-amber-950/70 dark:via-amber-900/60 dark:to-yellow-950/50 border-2 border-amber-400 dark:border-amber-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bell className="w-5 h-5 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <p className="text-amber-900 dark:text-amber-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <span>नया ऑफर!</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold">FESTIVE BULK DEAL</span>
              </p>
              <p className="text-slate-950 dark:text-white text-xs sm:text-sm font-black mt-0.5 leading-snug">
                Wholesale: &lsquo;Diwali Bulk Sale starts now! Up to 25% off on bulk orders.&rsquo;
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowOfferModal(true)}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all uppercase tracking-wider flex items-center gap-1.5 border border-amber-500 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>[CLAIM NOW]</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: 4 High-Impact KPI Cards (Financial & Operations)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Available Credit */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Available Credit
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
              ₹{stats.availableCredit.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              Limit: ₹{stats.creditLimit.toLocaleString('en-IN')} (30 Days)
            </p>
          </div>
        </div>

        {/* Card 2: Current Outstanding */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Current Outstanding
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className={`text-xl sm:text-2xl font-black ${stats.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
              ₹{stats.outstanding.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              {stats.outstanding === 0 ? 'Nil Udhaar • Fully Cleared' : 'Payment due in 15 days'}
            </p>
          </div>
        </div>

        {/* Card 3: Active Orders */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Active Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-400 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-400">
              {stats.pendingOrders}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              In-transit / Processing
            </p>
          </div>
        </div>

        {/* Card 4: Total Orders */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Total Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalOrders}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              100% On-time delivery
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: Main Split Layout (Reference Mockup)
          Left: Wholesale Products Grid | Right: Recent Orders + Quick Tools
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* ───────────────────────────────────────────────────────────
            LEFT COLUMN (Col 1-8): Wholesale Products Catalog
            ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">
          {/* Controls Bar: Title + Search + Filter Pills */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-soft space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span>Wholesale Products</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Direct factory rates for bulk retail stocking
                </p>
              </div>

              {/* Instant Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item, brand, SKU..."
                  className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Products ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCategory === c.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid (Matching reference mockup cards) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching products found</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting a different category.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg hover:bg-blue-100"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map((p) => {
                const price = parseFloat(p.final_price || p.selling_price || p.unit_price || 0);
                const mrp = parseFloat(p.mrp || p.standard_price || price);
                const moq = parseInt(p.minimum_order_quantity || p.moq || 1, 10);
                const packUnit = p.packaging || `Box of ${moq > 1 ? moq : 10}`;
                const stock = parseInt(p.available_stock ?? p.current_stock ?? 50, 10);
                const isAdded = addedState[p.id];
                const selectedQty = cardQuantities[p.id] || 1;
                const marginPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

                return (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col group"
                  >
                    {/* Product Image Area */}
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center p-3 overflow-hidden">
                      {p.image ? (
                        <img
                          src={getImageUrl(p.image)}
                          alt={p.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      ) : (
                        <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      )}

                      {/* Margin % badge */}
                      {marginPercent > 0 && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white shadow-sm tracking-wider">
                          {marginPercent}% MARGIN
                        </span>
                      )}

                      {/* Stock badge */}
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold shadow-sm ${
                        stock <= 10
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-900/80 text-white dark:bg-slate-800'
                      }`}>
                        {stock <= 10 ? `${stock} left` : 'In Stock'}
                      </span>
                    </div>

                    {/* Product Details */}
                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight min-h-[32px]">
                          {p.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                          {packUnit}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        {/* Price & Stepper Row */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div>
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                              ₹{price.toFixed(0)}
                            </span>
                            {mrp > price && (
                              <span className="text-[11px] text-slate-400 line-through ml-1.5 font-medium">
                                ₹{mrp.toFixed(0)}
                              </span>
                            )}
                          </div>

                          {/* Stepper ( - 1 + ) */}
                          <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(p.id, -1)}
                              className="px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition-colors"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="px-2 py-1 text-xs font-black text-slate-900 dark:text-white min-w-[22px] text-center select-none">
                              {selectedQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(p.id, 1)}
                              className="px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition-colors"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* ADD BOX TO CART Button (Royal Blue matching reference) */}
                        <button
                          type="button"
                          onClick={() => handleAddToCart(p)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide shadow-sm active:scale-[0.98] ${
                            isAdded
                              ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-4 h-4 text-white stroke-[3]" />
                              <span>ADDED TO CART!</span>
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

          {/* View Full Catalog Link */}
          <div className="text-center pt-2">
            <Link
              to="/shop/products"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-blue-600 text-xs font-extrabold shadow-sm transition-all hover:shadow"
            >
              <span>View All Products in Wholesale Catalog</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            </Link>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            RIGHT COLUMN (Col 9-12): Recent Orders & Retailer Tools
            ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card: MY RECENT ORDERS (Matching reference mockup right column) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-soft">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span>MY RECENT ORDERS</span>
              </h2>
              <Link
                to="/shop/orders"
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-6 text-center">
                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Orders Placed Yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select wholesale items from the left catalog and tap Add Box to Cart to place your first stock order.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOrders.map((o) => {
                  const dateStr = new Date(o.created_at || Date.now()).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  const amount = parseFloat(o.total_amount ?? o.total ?? 0);

                  return (
                    <div
                      key={o.id}
                      className="p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-400">
                            {o.order_number || `ORD-${o.id}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500 font-semibold">{dateStr}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusBadge(o.order_status)}
                        <button
                          type="button"
                          onClick={() => setPreviewOrder(o)}
                          title="View / Download Invoice"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom link: DOWNLOAD INVOICE */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-center">
              <Link
                to="/shop/bills"
                className="text-xs font-black text-blue-700 dark:text-blue-400 hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 uppercase tracking-wide"
              >
                <Download className="w-3.5 h-3.5 text-rose-600" />
                <span>DOWNLOAD INVOICE 📄</span>
              </Link>
            </div>
          </div>

          {/* Card: Credit & Udhaar Standing */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                <span>Credit Standing (ઉધાર)</span>
              </h3>
              <Link
                to="/shop/outstanding"
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                Khata Details
              </Link>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Available Credit:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">
                  ₹{stats.availableCredit.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Current Udhaar:</span>
                <span className="font-black text-slate-900 dark:text-white">
                  ₹{stats.outstanding.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Progress bar */}
              <div className="pt-1">
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (stats.outstanding / Math.max(stats.creditLimit, 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-semibold">
                  <span>₹0 Used</span>
                  <span>Limit: ₹{stats.creditLimit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Retailer Quick Tools (દુકાનદાર શોર્ટકટ્સ) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-soft">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Retailer Quick Tools</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/shop/reorder"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/80 transition-all text-left group"
              >
                <RefreshCw className="w-4 h-4 text-emerald-600 mb-1.5 group-hover:rotate-180 transition-transform duration-500" />
                <p className="text-xs font-black text-slate-900 dark:text-white">1-Click Reorder</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Repeat past order</p>
              </Link>

              <Link
                to="/shop/quick-order"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/80 transition-all text-left group"
              >
                <SlidersHorizontal className="w-4 h-4 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-slate-900 dark:text-white">Quick Bulk Order</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Direct SKU sheet</p>
              </Link>

              <Link
                to="/shop/bills"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/80 transition-all text-left group"
              >
                <Receipt className="w-4 h-4 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-slate-900 dark:text-white">GST Invoices</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Tax bills & reports</p>
              </Link>

              <Link
                to="/shop/help"
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/80 transition-all text-left group"
              >
                <Phone className="w-4 h-4 text-purple-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-black text-slate-900 dark:text-white">Helpline</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Direct support</p>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: Diwali Bulk Sale Claim Modal
          ═══════════════════════════════════════════════════════════════ */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-amber-300 dark:border-amber-700/80 shadow-2xl overflow-hidden p-6">
            <button
              type="button"
              onClick={() => setShowOfferModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pt-2">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 mx-auto flex items-center justify-center mb-3">
                <Sparkles className="w-8 h-8 fill-amber-500 text-amber-500" />
              </div>

              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider">
                Festival Wholesale Special
              </span>

              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-3">
                Diwali Bulk Sale 2026
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Save an extra 25% on carton quantities across all snacks, sweets, beverages and grocery items.
              </p>

              {/* Coupon Box */}
              <div className="mt-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">Promo Code</p>
                  <p className="text-lg font-mono font-black text-slate-950 dark:text-white">PURVAJ25</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCoupon}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  }`}
                >
                  {copiedCode ? 'COPIED! ✓' : 'COPY CODE'}
                </button>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition-all"
                >
                  Shop Wholesale Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: Instant Invoice Preview & Print
          ═══════════════════════════════════════════════════════════════ */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Order Invoice: {previewOrder.order_number || `ORD-${previewOrder.id}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-semibold">Store / Billed To:</span>
                <span className="font-bold text-slate-900 dark:text-white">{shopName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-semibold">Date:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {new Date(previewOrder.created_at || Date.now()).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-semibold">Status:</span>
                <div>{getStatusBadge(previewOrder.order_status)}</div>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 font-semibold">Total Amount:</span>
                <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                  ₹{parseFloat(previewOrder.total_amount ?? previewOrder.total ?? 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewOrder(null);
                  navigate('/shop/bills');
                }}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Full Invoices</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopDashboard;
