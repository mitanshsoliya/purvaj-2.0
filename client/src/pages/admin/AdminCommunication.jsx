import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Send, BellRing, Search, Plus, RefreshCw, CheckCircle2,
  AlertTriangle, Store, Clock, Users, ShieldAlert,
  Flame, Megaphone, MessageSquare, Info, History,
  Paperclip, ExternalLink, ArrowRight, Eye, CheckCheck,
  Building, ChevronRight, XCircle, Sliders, ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';

export const AdminCommunication = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Active Tab: 'broadcasts' | 'notifications' | 'history'
  const [activeTab, setActiveTab] = useState('broadcasts');
  const [broadcasts, setBroadcasts] = useState([]);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [shopGroups, setShopGroups] = useState([]);
  const [shopsList, setShopsList] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalBroadcasts: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalUnread: 0,
    deliveryRate: 100,
    readRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [selectedBroadcastDetail, setSelectedBroadcastDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Compose Form
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [composeSuccess, setComposeSuccess] = useState('');
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    target_type: 'ALL_SHOPS', // 'ALL_SHOPS' | 'SELECTED_SHOPS' | 'SHOP_GROUP'
    target_group_id: '',
    target_shop_ids: [],
    attachment_url: '',
    action_label: '',
    action_url: '',
    scheduled_at: '',
  });

  // New Group Form
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    discount_percentage: 0,
  });

  // Sync tab with URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/communication/notifications')) {
      setActiveTab('notifications');
    } else if (path.includes('/communication/history')) {
      setActiveTab('history');
    } else {
      setActiveTab('broadcasts');
    }
  }, [location.pathname]);

  // Load Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [broadRes, notifRes, groupsRes, shopsRes, sumRes] = await Promise.allSettled([
        api.get('/broadcasts'),
        api.get('/notifications/admin/all?limit=50'),
        api.get('/shop-groups'),
        api.get('/admin/shops?limit=100'),
        api.get('/broadcasts/summary'),
      ]);

      if (broadRes.status === 'fulfilled' && broadRes.value.data?.data?.broadcasts) {
        setBroadcasts(broadRes.value.data.data.broadcasts);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value.data?.data?.notifications) {
        setAdminNotifications(notifRes.value.data.data.notifications);
      }

      if (groupsRes.status === 'fulfilled' && groupsRes.value.data?.data?.groups) {
        setShopGroups(groupsRes.value.data.data.groups);
      }

      if (shopsRes.status === 'fulfilled' && shopsRes.value.data?.data?.shops) {
        setShopsList(shopsRes.value.data.data.shops);
      }

      if (sumRes.status === 'fulfilled' && sumRes.value.data?.data) {
        setSummaryStats(sumRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load communication datasets', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live Socket.IO updates for Admin
  useEffect(() => {
    if (!socket) return;

    socket.on('broadcast_sent', (data) => {
      fetchData();
    });

    socket.on('broadcast_recipient_read', () => {
      fetchData();
    });

    return () => {
      socket.off('broadcast_sent');
      socket.off('broadcast_recipient_read');
    };
  }, [socket, fetchData]);

  // Preset Fast Templates
  const handleApplyTemplate = (template) => {
    setForm((prev) => ({
      ...prev,
      title: template.title,
      message: template.message,
      priority: template.priority,
      action_label: template.action_label || '',
      action_url: template.action_url || '',
    }));
    setIsComposeModalOpen(true);
  };

  const templates = [
    {
      title: 'Tomorrow orders will close at 2 PM',
      message: 'Notice to all retail partners: Due to warehouse quarterly inventory audit, ordering will close strictly at 2:00 PM tomorrow. Please place daily requirements early.',
      priority: 'high',
      action_label: 'Quick Order Now',
      action_url: '/shop/quick-order',
    },
    {
      title: 'Fresh Inbound Stock: Sunflower Oil & Grains Arrived',
      message: 'New wholesale consignment of Fortune Sunlite Oil & Basmati Rice unpacked at Central Logistics Node. Tiered quantity discounts available.',
      priority: 'normal',
      action_label: 'View Catalog',
      action_url: '/shop/products',
    },
    {
      title: 'Monthly Credit Udhaar Settlement Reminder',
      message: 'Dear Partner, please review your outstanding ledger balance. Kindly clear pending credit dues via NEFT/RTGS to maintain uninterrupted dispatch credit lines.',
      priority: 'urgent',
      action_label: 'View Bills & Settle',
      action_url: '/shop/bills',
    },
  ];

  // Dispatch Broadcast
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    setComposeError('');
    setComposeSuccess('');

    if (!form.title.trim() || !form.message.trim()) {
      setComposeError('Please fill in both title and message.');
      return;
    }

    if (form.target_type === 'SHOP_GROUP' && !form.target_group_id) {
      setComposeError('Please select a target shop group.');
      return;
    }

    if (form.target_type === 'SELECTED_SHOPS' && form.target_shop_ids.length === 0) {
      setComposeError('Please select at least one shop for targeted delivery.');
      return;
    }

    setSending(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        target_type: form.target_type,
        target_group_id: form.target_type === 'SHOP_GROUP' ? form.target_group_id : undefined,
        target_shop_ids: form.target_type === 'SELECTED_SHOPS' ? form.target_shop_ids : undefined,
        attachment_url: form.attachment_url.trim() || undefined,
        action_label: form.action_label.trim() || undefined,
        action_url: form.action_url.trim() || undefined,
        scheduled_at: form.scheduled_at || undefined,
      };

      const res = await api.post('/broadcasts', payload);
      if (res.data?.success) {
        setComposeSuccess(`Broadcast dispatched to ${res.data.data?.recipients_count || 0} shops!`);
        setTimeout(() => {
          setIsComposeModalOpen(false);
          setComposeSuccess('');
          setForm({
            title: '',
            message: '',
            priority: 'normal',
            target_type: 'ALL_SHOPS',
            target_group_id: '',
            target_shop_ids: [],
            attachment_url: '',
            action_label: '',
            action_url: '',
            scheduled_at: '',
          });
        }, 1200);
        fetchData();
      }
    } catch (err) {
      setComposeError(err.response?.data?.message || err.message || 'Failed to dispatch broadcast');
    } finally {
      setSending(false);
    }
  };

  // Create Shop Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    setCreatingGroup(true);
    try {
      await api.post('/shop-groups', groupForm);
      setGroupForm({ name: '', description: '', discount_percentage: 0 });
      fetchData();
    } catch (err) {
      console.error('Failed to create shop group', err);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Open Broadcast Detail
  const handleOpenBroadcastDetail = async (broadcastId) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/broadcasts/${broadcastId}`);
      if (res.data?.success && res.data?.data?.broadcast) {
        setSelectedBroadcastDetail(res.data.data.broadcast);
      }
    } catch (err) {
      console.error('Failed to load broadcast detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-200 dark:border-amber-800">High</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Notice</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">Normal</span>;
    }
  };

  // Filtered broadcast list
  const filteredBroadcasts = broadcasts.filter((b) => {
    if (!search) return true;
    return (
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.message?.toLowerCase().includes(search.toLowerCase()) ||
      b.target_display?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-soft">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Real-Time Communication & Broadcast Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Centralized multi-target notifications, live WebSocket announcements, and shop group dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            icon={Sliders}
            onClick={() => setIsGroupsModalOpen(true)}
          >
            Shop Groups
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Send}
            onClick={() => setIsComposeModalOpen(true)}
          >
            New Broadcast
          </Button>
          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh feeds"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Total Broadcasts</span>
            <Megaphone className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {summaryStats.totalBroadcasts || broadcasts.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Sent across wholesale network
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Total Messages Sent</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {summaryStats.totalSent.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
            {summaryStats.totalUnread} Unread pending
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Delivered Messages</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summaryStats.totalDelivered.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summaryStats.deliveryRate}% network delivery
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Read Confirmation</span>
            <Eye className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {summaryStats.totalRead.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {summaryStats.readRate}% confirmed read
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('broadcasts');
            navigate('/admin/communication');
          }}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'broadcasts'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcast Center</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('notifications');
            navigate('/admin/communication/notifications');
          }}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>System Notifications ({adminNotifications.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            navigate('/admin/communication/history');
          }}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Message History & Delivery Metrics</span>
        </button>
      </div>

      {/* TAB 1: BROADCAST CENTER */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-6">
          {/* Fast Broadcast Templates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Instant Dispatch Presets (1-Click Templates)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {templates.map((tpl, i) => (
                <div
                  key={i}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500 hover:shadow-soft-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-2">
                    {getPriorityBadge(tpl.priority)}
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1 group-hover:underline">
                      Use Preset <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                    {tpl.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {tpl.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Broadcasts Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Recent Broadcast Feeds</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {filteredBroadcasts.length}
                </span>
              </h3>

              <div className="w-64">
                <Input
                  size="sm"
                  placeholder="Filter announcements..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={Search}
                />
              </div>
            </div>

            {loading ? (
              <LoadingState message="Loading broadcast feeds..." />
            ) : filteredBroadcasts.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No broadcast messages found"
                description="Click 'New Broadcast' above to announce special arrivals, price revisions, or cutoff notices."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBroadcasts.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft-sm space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(b.priority)}
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {b.target_display || 'All Shops'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                        {b.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {b.message}
                      </p>
                    </div>

                    {/* Delivery & Read Counter Strip (as requested in prompt) */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Sent: </span>
                        <strong className="text-slate-900 dark:text-white">{b.total_recipients || b.recipient_count || 0}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Delivered: </span>
                        <strong className="text-emerald-600 dark:text-emerald-400">{b.delivered_count || 0}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Read: </span>
                        <strong className="text-purple-600 dark:text-purple-400">{b.read_count || 0}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Unread: </span>
                        <strong className="text-amber-600 dark:text-amber-400">{b.unread_count || 0}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        By {b.sender_name || 'Central Warehouse'}
                      </span>

                      <Button
                        variant="ghost"
                        size="xs"
                        icon={Eye}
                        onClick={() => handleOpenBroadcastDetail(b.id)}
                      >
                        Delivery Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM NOTIFICATIONS AUDIT */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Platform Notification Activity Stream
            </h3>
            <span className="text-xs text-slate-500">
              Showing recent platform events & shop alerts
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-soft-sm">
            {adminNotifications.map((notif) => (
              <div key={notif.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BellRing className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span>Recipient: <strong className="text-slate-700 dark:text-slate-300">{notif.recipient_name || notif.shop_name || 'Retailer'}</strong></span>
                    <span>•</span>
                    <span className={`font-semibold ${notif.is_read ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {notif.is_read ? 'Read by Shop' : 'Unread'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MESSAGE HISTORY & DELIVERY METRICS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Detailed Broadcast Delivery & Read Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Authoritative recipient audit tracking sent, delivered, read, and unread counts per announcement
              </p>
            </div>
            <div className="w-72">
              <Input
                size="sm"
                placeholder="Search history by title / target..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={Search}
              />
            </div>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-soft-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-500 uppercase font-semibold text-[11px]">
                  <th className="py-3 px-4">Title & Message</th>
                  <th className="py-3 px-3">Target Audience</th>
                  <th className="py-3 px-3">Sent Time</th>
                  <th className="py-3 px-3 text-center">Total Sent</th>
                  <th className="py-3 px-3 text-center">Delivered</th>
                  <th className="py-3 px-3 text-center">Read</th>
                  <th className="py-3 px-3 text-center">Unread</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBroadcasts.map((b) => {
                  const sent = b.total_recipients || b.recipient_count || 0;
                  const delivered = b.delivered_count || 0;
                  const read = b.read_count || 0;
                  const unread = b.unread_count || 0;
                  const readPct = sent > 0 ? Math.round((read / sent) * 100) : 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {getPriorityBadge(b.priority)}
                          <strong className="text-slate-900 dark:text-white truncate">
                            {b.title}
                          </strong>
                        </div>
                        <p className="text-slate-500 truncate text-[11px]">
                          {b.message}
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {b.target_display || 'All Shops'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-500">
                        {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                        {sent}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {delivered}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {read}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({readPct}%)
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className={`font-bold ${unread > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                          {unread}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="xs"
                          icon={Eye}
                          onClick={() => handleOpenBroadcastDetail(b.id)}
                        >
                          View Breakdown
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPOSE BROADCAST MODAL */}
      {isComposeModalOpen && (
        <Modal
          isOpen={isComposeModalOpen}
          onClose={() => setIsComposeModalOpen(false)}
          title="Compose Real-Time Broadcast Announcement"
          size="lg"
        >
          <form onSubmit={handleSendBroadcast} className="space-y-4">
            {composeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{composeError}</span>
              </div>
            )}

            {composeSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{composeSuccess}</span>
              </div>
            )}

            {/* Title & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Broadcast Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Tomorrow orders will close at 2 PM"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Urgency Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent Announcement</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>

            {/* Target Audience Selector (As requested in prompt) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Target Audience *
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ALL_SHOPS', label: 'All Shops', desc: 'Broadcast to entire network' },
                  { id: 'SHOP_GROUP', label: 'Shop Group', desc: 'VIP, Surat, New, Custom' },
                  { id: 'SELECTED_SHOPS', label: 'Selected Shops', desc: 'Pick individual retailers' },
                ].map((tgt) => (
                  <button
                    key={tgt.id}
                    type="button"
                    onClick={() => setForm({ ...form, target_type: tgt.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.target_type === tgt.id
                        ? 'bg-brand-50/60 dark:bg-brand-950/40 border-brand-600 text-brand-900 dark:text-brand-300 ring-1 ring-brand-600'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">{tgt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{tgt.desc}</div>
                  </button>
                ))}
              </div>

              {/* Conditional Group Selector */}
              {form.target_type === 'SHOP_GROUP' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Shop Group:
                  </label>
                  <select
                    value={form.target_group_id}
                    onChange={(e) => setForm({ ...form, target_group_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose Shop Group --</option>
                    {shopGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.member_count || 0} shops) - {g.description || 'Standard Group'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional Multi-Shop Selector */}
              {form.target_type === 'SELECTED_SHOPS' && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Choose Retailers ({form.target_shop_ids.length} selected):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (form.target_shop_ids.length === shopsList.length) {
                          setForm({ ...form, target_shop_ids: [] });
                        } else {
                          setForm({ ...form, target_shop_ids: shopsList.map((s) => s.id) });
                        }
                      }}
                      className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                    >
                      {form.target_shop_ids.length === shopsList.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                    {shopsList.map((s) => {
                      const isSelected = form.target_shop_ids.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-750 rounded cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({ ...form, target_shop_ids: [...form.target_shop_ids, s.id] });
                              } else {
                                setForm({ ...form, target_shop_ids: form.target_shop_ids.filter((id) => id !== s.id) });
                              }
                            }}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200">{s.shop_name}</span>
                          <span className="text-slate-400 text-[11px]">({s.city || 'Gujarat'})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Announcement Message Content *
              </label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Enter complete broadcast message text that will be received by retail shop owners..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Optional Attachment & Action Button (As requested in prompt) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Attachment Link (Image / PDF)
                </label>
                <Input
                  placeholder="https://example.com/rates-circular.pdf"
                  value={form.attachment_url}
                  onChange={(e) => setForm({ ...form, attachment_url: e.target.value })}
                  leftIcon={Paperclip}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Scheduled Delivery Time
                </label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Action Button Label
                </label>
                <Input
                  placeholder="e.g. Quick Order Now"
                  value={form.action_label}
                  onChange={(e) => setForm({ ...form, action_label: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Action Button URL
                </label>
                <Input
                  placeholder="e.g. /shop/quick-order or /shop/bills"
                  value={form.action_url}
                  onChange={(e) => setForm({ ...form, action_url: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsComposeModalOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                type="submit"
                isLoading={sending}
              >
                Dispatch Real-Time Broadcast
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* SHOP GROUPS MANAGEMENT MODAL */}
      {isGroupsModalOpen && (
        <Modal
          isOpen={isGroupsModalOpen}
          onClose={() => setIsGroupsModalOpen(false)}
          title="Manage Wholesale Shop Groups"
          size="lg"
        >
          <div className="space-y-5">
            {/* Create Group Form */}
            <form onSubmit={handleCreateGroup} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Create New Shop Group
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  size="sm"
                  required
                  placeholder="Group Name (e.g. Rajkot Shops)"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                />
                <Input
                  size="sm"
                  placeholder="Description..."
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <Input
                    size="sm"
                    type="number"
                    placeholder="Discount %"
                    value={groupForm.discount_percentage}
                    onChange={(e) => setGroupForm({ ...groupForm, discount_percentage: e.target.value })}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    isLoading={creatingGroup}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </form>

            {/* Existing Groups List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Active Wholesale Groups ({shopGroups.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {shopGroups.map((grp) => (
                  <div key={grp.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 dark:text-white">{grp.name}</strong>
                        {parseFloat(grp.discount_percentage) > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 text-[10px] font-bold">
                            {grp.discount_percentage}% discount
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{grp.description || 'Standard Group'}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {grp.member_count || 0} Shops
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGroupsModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* BROADCAST DELIVERY BREAKDOWN MODAL */}
      {selectedBroadcastDetail && (
        <Modal
          isOpen={!!selectedBroadcastDetail}
          onClose={() => setSelectedBroadcastDetail(null)}
          title={`Delivery Breakdown: ${selectedBroadcastDetail.title}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Stats Header (as requested in prompt) */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <div className="text-slate-400 font-medium">Sent</div>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {selectedBroadcastDetail.stats?.total || 0}
                </div>
              </div>
              <div>
                <div className="text-slate-400 font-medium">Delivered</div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {selectedBroadcastDetail.stats?.delivered || 0}
                </div>
              </div>
              <div>
                <div className="text-slate-400 font-medium">Read</div>
                <div className="text-base font-black text-purple-600 dark:text-purple-400">
                  {selectedBroadcastDetail.stats?.read || 0}
                </div>
              </div>
              <div>
                <div className="text-slate-400 font-medium">Unread</div>
                <div className="text-base font-black text-amber-600 dark:text-amber-400">
                  {selectedBroadcastDetail.stats?.unread || 0}
                </div>
              </div>
            </div>

            {/* Recipient Roster */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Recipient Retailer Audit Roster
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {(selectedBroadcastDetail.recipients || []).map((r, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900 dark:text-white">{r.shop_name || r.recipient_name}</strong>
                      <div className="text-[11px] text-slate-400">
                        {r.shop_city || 'Gujarat'} • Mobile: {r.recipient_mobile || 'N/A'}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        r.delivery_status === 'READ'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-400'
                          : r.delivery_status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400'
                      }`}>
                        {r.delivery_status}
                      </span>
                      {r.read_at && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Read: {new Date(r.read_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBroadcastDetail(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminCommunication;
