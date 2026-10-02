import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Filter,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  FileText,
  RefreshCw,
  ArrowRight,
  Eye,
  AlertCircle,
  Calendar,
  X,
  CreditCard
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Drawer from '../../components/common/Drawer';

const STATUS_TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'processing', label: 'Processing' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const ShopOrders = () => {
  const { loadOrderItemsIntoCart } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected order details drawer
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [activeTab, searchQuery]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '50');

      const res = await api.get(`/orders?${params.toString()}`);
      if (res.data?.success && res.data?.data) {
        setOrders(res.data.data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
      addToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (orderId) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.data?.success && res.data?.data?.order) {
        setSelectedOrder(res.data.data.order);
      }
    } catch (err) {
      console.error('Failed to fetch order detail', err);
      addToast('Failed to load order details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReorder = (order) => {
    if (!order || !order.items || order.items.length === 0) {
      addToast('No items to reorder', 'warning');
      return;
    }

    loadOrderItemsIntoCart(order.items, 'append');
    addToast('Items loaded into wholesale cart!', 'success');
    navigate('/shop/cart');
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this pending wholesale order?')) return;
    setCancelling(true);
    try {
      const res = await api.patch(`/orders/${orderId}/cancel`);
      if (res.data?.success) {
        addToast('Order successfully cancelled', 'info');
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Order cancellation failed', err);
      addToast(err.response?.data?.message || 'Could not cancel order', 'error');
    } finally {
      setCancelling(false);
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
        return <Badge variant="neutral">Pending Approval</Badge>;
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Wholesale Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track warehouse fulfillment, download GST bills, and 1-click reorder
          </p>
        </div>

        <Link to="/shop/products">
          <Button variant="primary" size="sm" icon={Package}>
            Start New Order
          </Button>
        </Link>
      </div>

      {/* Search & Tabs Row */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order number (e.g. ORD-20261002)..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-soft-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No orders found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {activeTab !== 'all'
              ? `You don't have any orders with status "${activeTab}".`
              : 'You have not placed any wholesale orders yet.'}
          </p>
          <Link to="/shop/products" className="inline-block mt-4">
            <Button variant="primary" size="sm" icon={Package}>
              Browse Catalog
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-soft hover:border-brand-500 transition-all space-y-3"
            >
              {/* Order Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-brand-600 dark:text-brand-400">
                    {order.order_number}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(order.order_status)}
                </div>
              </div>

              {/* Order Content Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block uppercase">Total Bill</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                    ₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block uppercase">Payment Mode</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize mt-0.5 block truncate">
                    {order.payment_method || 'Credit (Udhaar)'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block uppercase">Payment Status</span>
                  <span className={`font-semibold capitalize mt-0.5 block ${order.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {order.payment_status}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block uppercase">Items Count</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5 block">
                    {order.item_count || 'Wholesale manifest'}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDetail(order.id)}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Items & Tracking</span>
                </button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    onClick={() => handleOpenDetail(order.id)}
                    className="text-xs text-brand-600 font-semibold"
                  >
                    1-Click Reorder
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Drawer */}
      <Drawer
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order #${selectedOrder.order_number}` : 'Order Details'}
        subtitle="Wholesale fulfillment manifest & status timeline"
        position="right"
      >
        {selectedOrder && (
          <div className="space-y-5 pb-6">
            {/* Status Timeline */}
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Fulfillment Status Timeline
              </h3>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {/* 1. Placed */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Order Placed</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(selectedOrder.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* 2. Confirmed */}
                <div className="relative">
                  <div
                    className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      ['confirmed', 'processing', 'dispatched', 'delivered'].includes(selectedOrder.order_status)
                        ? 'bg-emerald-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Warehouse Confirmed</p>
                  <p className="text-[11px] text-slate-500">Inventory reserved at Central Hub</p>
                </div>

                {/* 3. Dispatched */}
                <div className="relative">
                  <div
                    className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      ['dispatched', 'delivered'].includes(selectedOrder.order_status)
                        ? 'bg-emerald-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Dispatched in Vehicle</p>
                  <p className="text-[11px] text-slate-500">
                    {selectedOrder.order_status === 'dispatched'
                      ? 'Out for delivery to storefront'
                      : 'Delivery dispatch manifest created'}
                  </p>
                </div>

                {/* 4. Delivered */}
                <div className="relative">
                  <div
                    className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      selectedOrder.order_status === 'delivered'
                        ? 'bg-emerald-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Delivered & Signed</p>
                  <p className="text-[11px] text-slate-500">Store delivery handover completed</p>
                </div>
              </div>
            </div>

            {/* Line Items List */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Order Items ({selectedOrder.items?.length || 0})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {item.product_name || item.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        SKU: {item.sku} • {item.quantity} units @ ₹{parseFloat(item.unit_price).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900 dark:text-white">
                        ₹{parseFloat(item.total_amount || item.unit_price * item.quantity).toFixed(2)}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        +{item.tax_rate || 0}% GST
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{parseFloat(selectedOrder.subtotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total GST:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{parseFloat(selectedOrder.tax_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Wholesale Freight:</span>
                <span>FREE</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="text-brand-600 dark:text-brand-400">
                  ₹{parseFloat(selectedOrder.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Actions: Reorder, View Invoice, Cancel */}
            <div className="space-y-2 pt-2">
              <Button
                variant="primary"
                size="md"
                icon={RefreshCw}
                onClick={() => handleReorder(selectedOrder)}
                className="w-full bg-brand-600 hover:bg-brand-500 font-bold shadow-soft"
              >
                1-Click Reorder This Entire List ➔
              </Button>

              <Link to="/shop/bills" className="block">
                <Button variant="secondary" size="md" icon={FileText} className="w-full">
                  Download Official GST Tax Invoice
                </Button>
              </Link>

              {selectedOrder.order_status === 'pending' && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={cancelling}
                  icon={XCircle}
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className="w-full"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ShopOrders;
