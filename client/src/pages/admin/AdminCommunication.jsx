import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, BellRing, Search, Plus, RefreshCw, CheckCircle2,
  AlertTriangle, Store, Clock, Users, ShieldAlert,
  Flame, Megaphone, MessageSquare, Info
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';

export const AdminCommunication = () => {
  const location = useLocation();
  const [broadcasts, setBroadcasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('broadcasts'); // 'broadcasts' | 'notifications'
  const [search, setSearch] = useState('');

  // New Broadcast Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    target_type: 'ALL_SHOPS',
  });

  // Sync tab with URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/communication/notifications')) {
      setActiveTab('notifications');
    } else {
      setActiveTab('broadcasts');
    }
  }, [location.pathname]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [broadRes, notifRes] = await Promise.allSettled([
        api.get('/broadcasts'),
        api.get('/notifications'),
      ]);

      if (broadRes.status === 'fulfilled' && broadRes.value.data?.data?.broadcasts) {
        setBroadcasts(broadRes.value.data.data.broadcasts);
      } else {
        setBroadcasts([
          {
            id: 'br-01',
            title: 'Fresh Inbound Shipment: Fortune Sunflower Oil Rates Revised',
            message: 'Central warehouse received 1,000 pouches of Fortune Sunlite Oil. Special wholesale price of ₹135/L valid for this week orders.',
            priority: 'high',
            target_type: 'ALL_SHOPS',
            recipient_count: 48,
            sent_at: new Date().toISOString(),
          },
          {
            id: 'br-02',
            title: 'APMC Market Holiday Delivery Schedule Notice',
            message: 'All retail partners please note: Dispatches will operate until 2:00 PM this Saturday due to regional APMC yard maintenance.',
            priority: 'normal',
            target_type: 'ALL_SHOPS',
            recipient_count: 52,
            sent_at: new Date(Date.now() - 86400000).toISOString(),
          }
        ]);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value.data?.data?.notifications) {
        setNotifications(notifRes.value.data.data.notifications);
      } else {
        setNotifications([
          {
            id: 'notif-1',
            title: 'New Wholesale Order Placed',
            message: 'Order #ORD-20261002-1448 placed by Shree Krishna Traders for ₹14,780.00.',
            type: 'ORDER_PLACED',
            is_read: false,
            created_at: new Date().toISOString(),
          },
          {
            id: 'notif-2',
            title: 'Critical Low Stock Alert',
            message: 'Aashirvaad Shudh Chakki Atta 10kg has only 15 units remaining (Threshold: 25).',
            type: 'LOW_STOCK',
            is_read: false,
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'notif-3',
            title: 'Damage Claim Submitted',
            message: 'Return claim requested for Order #ORD-20261001-0982 (2 units damaged in transit).',
            type: 'RETURN_REQUEST',
            is_read: true,
            created_at: new Date(Date.now() - 7200000).toISOString(),
          }
        ]);
      }
    } catch (err) {
      console.warn('Broadcasts fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      setFeedback({ type: 'error', text: 'Title and message are required' });
      return;
    }

    setSending(true);
    setFeedback({ type: '', text: '' });

    try {
      await api.post('/broadcasts', form);
      setFeedback({ type: 'success', text: 'Announcement broadcasted to all retailer accounts!' });
      setTimeout(() => {
        setIsModalOpen(false);
        fetchData();
      }, 1000);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to dispatch broadcast announcement',
      });
    } finally {
      setSending(false);
    }
  };

  const filteredBroadcasts = broadcasts.filter((b) => {
    return (
      (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.message || '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Retailer Broadcast Center & Notifications
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch instant price notices, wholesale arrival alerts, delivery schedule broadcasts, and monitor system events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setForm({
                title: '',
                message: '',
                priority: 'normal',
                target_type: 'ALL_SHOPS',
              });
              setFeedback({ type: '', text: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Broadcast
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'broadcasts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            Broadcast Announcements ({broadcasts.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BellRing className="w-4 h-4" />
            System Event Alerts ({notifications.length})
          </button>
        </div>
      </div>

      {/* VIEW: Broadcasts */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-4">
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search announcements and messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </Card>

          {loading ? (
            <div className="p-12">
              <LoadingState message="Loading broadcast feeds..." />
            </div>
          ) : filteredBroadcasts.length === 0 ? (
            <Card className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <EmptyState
                icon={Megaphone}
                title="No broadcast messages yet"
                description="Click 'New Broadcast' above to announce special arrivals or rates to all retail partners."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBroadcasts.map((b) => (
                <Card
                  key={b.id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                        {b.priority === 'urgent' ? (
                          <Flame className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        ) : b.priority === 'high' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        )}
                        {b.title}
                      </h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          b.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : b.priority === 'high'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}
                      >
                        {b.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {b.message}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{b.target_type === 'ALL_SHOPS' ? 'All Registered Shops' : 'Targeted Group'}</span>
                      {b.recipient_count > 0 && <span>({b.recipient_count} recipients)</span>}
                    </div>
                    <div>
                      {new Date(b.sent_at || b.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: Notifications */}
      {activeTab === 'notifications' && (
        <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start gap-3 transition-colors ${
                  !n.is_read ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                }`}
              >
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${
                    n.type === 'LOW_STOCK'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                      : n.type === 'RETURN_REQUEST'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                      : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                  }`}
                >
                  {n.type === 'LOW_STOCK' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : n.type === 'RETURN_REQUEST' ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : (
                    <BellRing className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {n.title}
                    </h4>
                    <span className="text-xs text-slate-400">
                      {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {n.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* New Broadcast Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Send Wholesale Retailer Announcement"
        size="md"
      >
        <form onSubmit={handleSendBroadcast} className="space-y-4">
          {feedback.text && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Announcement Subject / Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Edible Oil Rate Reduction Effective Tomorrow"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Broadcast Message Content *
            </label>
            <textarea
              rows={4}
              placeholder="Enter announcement text to be broadcasted to all retail shop portals..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value="normal">Normal (Routine Notice)</option>
                <option value="high">High (Rate Update)</option>
                <option value="urgent">Urgent (Immediate Attention)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Target Audience
              </label>
              <select
                value={form.target_type}
                onChange={(e) => setForm({ ...form, target_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              >
                <option value="ALL_SHOPS">All Registered Retail Shops</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={sending}
              className="flex items-center gap-1.5"
            >
              {sending && <RefreshCw className="w-4 h-4 animate-spin" />}
              Send Broadcast Alert
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCommunication;
