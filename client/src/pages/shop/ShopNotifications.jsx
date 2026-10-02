import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCircle2, Clock, Sparkles, Package, DollarSign,
  AlertTriangle, ArrowRight, CheckCheck, RefreshCw, Filter,
  Megaphone, ExternalLink, Paperclip, ChevronRight, Store, ShieldAlert
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export const ShopNotifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    counts,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    connected,
  } = useSocket();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'announcements' | 'orders' | 'payments' | 'stock'
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => {
    fetchNotifications(activeTab);
  }, [activeTab, fetchNotifications]);

  const tabs = [
    { id: 'all', label: 'All', count: counts.total || notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'announcements', label: 'Announcements', count: counts.announcements || 0 },
    { id: 'orders', label: 'Orders', count: counts.orders || 0 },
    { id: 'payments', label: 'Payments', count: counts.payments || 0 },
    { id: 'stock', label: 'Stock / Alerts', count: counts.stock || 0 },
  ];

  const getNotificationIcon = (type, priority) => {
    if (priority === 'urgent') {
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 shadow-soft-sm">
          <ShieldAlert className="w-5 h-5" />
        </div>
      );
    }
    switch (type) {
      case 'broadcast':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 shadow-soft-sm">
            <Megaphone className="w-5 h-5" />
          </div>
        );
      case 'payment':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-soft-sm">
            <DollarSign className="w-5 h-5" />
          </div>
        );
      case 'order':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 shadow-soft-sm">
            <Package className="w-5 h-5" />
          </div>
        );
      case 'stock':
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 shadow-soft-sm">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0 shadow-soft-sm">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-200 dark:border-amber-800">High Priority</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Notice</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">Normal</span>;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-soft">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Notifications & Broadcasts
              </h1>
              {connected && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Hub
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Instant warehouse announcements, early closing alerts, order dispatches & payment receipts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCheck}
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
          <button
            type="button"
            onClick={() => fetchNotifications(activeTab)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh feeds"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white shadow-soft-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.id === 'unread'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications Stream */}
      {loading && notifications.length === 0 ? (
        <div className="py-12 text-center">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Checking for new messages...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No notifications in this folder
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              You are all caught up! New warehouse broadcasts and order updates will appear here in real-time.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => {
            const isUnread = !n.is_read;
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (isUnread) markAsRead(n.id);
                  setSelectedNotification(n);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isUnread
                    ? 'bg-brand-50/40 dark:bg-brand-950/20 border-brand-200 dark:border-brand-850 shadow-soft-sm hover:border-brand-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Unread dot indicator */}
                {isUnread && (
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full bg-brand-600 dark:bg-brand-500" />
                )}

                <div className="flex items-start gap-3.5">
                  {getNotificationIcon(n.type, n.priority)}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {n.title}
                        </h4>
                        {getPriorityBadge(n.priority)}
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                        {formatTimeAgo(n.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    {/* Footer Info & Actions */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                      <div className="flex items-center gap-3 text-slate-400">
                        <span className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" />
                          {n.sender_name || 'Purvaj Central Warehouse'}
                        </span>
                        {n.attachment_url && (
                          <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-medium">
                            <Paperclip className="w-3 h-3" />
                            Attachment
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {n.action_label && n.action_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isUnread) markAsRead(n.id);
                              navigate(n.action_url);
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                          >
                            <span>{n.action_label}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-slate-400 group-hover:text-brand-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <Modal
          isOpen={!!selectedNotification}
          onClose={() => setSelectedNotification(null)}
          title="Notification Details"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {getNotificationIcon(selectedNotification.type, selectedNotification.priority)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedNotification.title}
                  </h3>
                  {getPriorityBadge(selectedNotification.priority)}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>From: {selectedNotification.sender_name || 'Purvaj Central Warehouse Operations'}</span>
                  <span>•</span>
                  <span>{new Date(selectedNotification.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {selectedNotification.message}
            </div>

            {/* Optional Attachment Preview */}
            {selectedNotification.attachment_url && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                  <Paperclip className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span className="truncate">{selectedNotification.attachment_url}</span>
                </div>
                <a
                  href={selectedNotification.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-md bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 text-xs font-semibold hover:underline flex items-center gap-1 flex-shrink-0"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedNotification(null)}
              >
                Close
              </Button>
              {selectedNotification.action_label && selectedNotification.action_url && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={ArrowRight}
                  onClick={() => {
                    const url = selectedNotification.action_url;
                    setSelectedNotification(null);
                    navigate(url);
                  }}
                >
                  {selectedNotification.action_label}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ShopNotifications;
