import React, { useState, useEffect } from 'react';
import {
  Bell,
  Package,
  Truck,
  Gift,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

export const ShopNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [broadcastsRes, ordersRes] = await Promise.allSettled([
        api.get('/broadcasts'),
        api.get('/orders?limit=10'),
      ]);

      const items = [];

      // Add broadcasts from warehouse
      if (broadcastsRes.status === 'fulfilled' && broadcastsRes.value.data?.data) {
        const broadcasts = broadcastsRes.value.data.data.broadcasts || [];
        broadcasts.forEach((b) => {
          items.push({
            id: `bc-${b.id}`,
            title: b.title,
            message: b.message,
            type: 'broadcast',
            created_at: b.created_at,
          });
        });
      }

      // Add live order updates
      if (ordersRes.status === 'fulfilled' && ordersRes.value.data?.data) {
        const orders = ordersRes.value.data.data.orders || [];
        orders.slice(0, 5).forEach((o) => {
          items.push({
            id: `ord-${o.id}`,
            title: `Order #${o.order_number} Update`,
            message: `Current Status: ${o.order_status.toUpperCase()}. Total Amount: ₹${parseFloat(o.total_amount).toLocaleString('en-IN')}`,
            type: o.order_status === 'delivered' ? 'success' : o.order_status === 'dispatched' ? 'dispatch' : 'order',
            created_at: o.updated_at || o.created_at,
          });
        });
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (items.length === 0) {
        // Fallback default system notice
        items.push({
          id: 'welcome',
          title: 'Welcome to Purvaj 2.0 Wholesale Hub',
          message: 'Your retailer store account is connected to Purvaj Central Warehouse with active credit terms.',
          type: 'success',
          created_at: new Date().toISOString(),
        });
      }

      setNotifications(items);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'dispatch':
        return (
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Truck className="w-4 h-4" />
          </div>
        );
      case 'success':
        return (
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'broadcast':
        return (
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
            <Package className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-24">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-600 text-white">
            <Bell className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notifications & Broadcasts
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time order stage updates, warehouse dispatch manifests, and announcements
        </p>
      </div>

      <Card title="Activity Feed" subtitle="Chronological alerts from warehouse dispatch">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((item) => (
              <div key={item.id} className="py-3.5 flex items-start gap-3 text-xs">
                {getIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                    {item.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ShopNotifications;
