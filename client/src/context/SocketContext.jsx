import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    unread: 0,
    announcements: 0,
    orders: 0,
    payments: 0,
    stock: 0,
  });
  const [loading, setLoading] = useState(false);

  // Audio synthesizer chime for incoming notifications (zero external audio file dependency)
  const playNotificationSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3); // D6

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime + 0.15);
      osc1.stop(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio playback blocked by browser autoplay policy if user hasn't interacted yet
    }
  }, []);

  // Fetch initial notifications from database (Offline persistence support)
  const fetchNotifications = useCallback(async (type = 'all') => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get(`/notifications?type=${type}&limit=50`);
      if (res.data?.success && res.data?.data) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unreadCount || 0);
        if (res.data.data.counts) {
          setCounts(res.data.data.counts);
        }
      }
    } catch (err) {
      console.warn('Failed to load notifications from server', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const res = await api.patch(`/notifications/${id}/read`);
      if (res.data?.success && res.data?.data?.unreadCount !== undefined) {
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to mark notification read', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      setCounts((prev) => ({ ...prev, unread: 0 }));

      await api.patch('/notifications/read-all');
      addToast('All notifications marked as read', 'success');
    } catch (err) {
      console.error('Failed to mark all read', err);
      fetchNotifications();
    }
  }, [addToast, fetchNotifications]);

  // Connect to Socket.IO when user is authenticated
  useEffect(() => {
    if (!user) {
      if (socket) socket.disconnect();
      setSocket(null);
      setConnected(false);
      return;
    }

    const token =
      localStorage.getItem('purvaj_access_token') ||
      (user.role === 'admin' ? 'demo_jwt_token_purvaj_2.0' : `jwt_shop_${user.id || 'demo'}`);

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      console.log(`[Socket] Connected to Purvaj Wholesale realtime hub: ${newSocket.id}`);
      setConnected(true);
      fetchNotifications();
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    // Real-time unread count updates
    newSocket.on('unread_count_updated', (data) => {
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    });

    // Real-time notification arrival
    newSocket.on('new_notification', (data) => {
      console.log('[Socket] New real-time notification received:', data);

      // 1. Play chime audio
      playNotificationSound();

      // 2. Increment unread count
      setUnreadCount((prev) => prev + 1);

      // 3. Prepend to notifications state
      const notifItem = data.notification || {
        id: data.id || `notif-${Date.now()}`,
        broadcast_id: data.broadcast_id,
        title: data.title,
        message: data.message,
        priority: data.priority || 'normal',
        attachment_url: data.attachment_url,
        action_label: data.action_label,
        action_url: data.action_url,
        is_read: false,
        type: 'broadcast',
        created_at: data.created_at || new Date().toISOString(),
        sender_name: data.sender_name || 'Central Warehouse',
      };

      setNotifications((prev) => [notifItem, ...prev]);

      // 4. Pop up high-visibility toast alert
      const priorityPrefix = data.priority === 'urgent' ? '[URGENT] ' : data.priority === 'high' ? '[IMPORTANT] ' : '';
      addToast(`${priorityPrefix}${data.title}: ${data.message.slice(0, 80)}${data.message.length > 80 ? '...' : ''}`, 'info');

      // 5. Acknowledge delivery back to server
      if (data.broadcast_id || data.notification?.id) {
        newSocket.emit('acknowledge_delivery', {
          broadcast_id: data.broadcast_id,
          notification_id: data.notification?.id,
        });
      }
    });

    setSocket(newSocket);

    // Initial fetch on mount
    fetchNotifications();

    return () => {
      newSocket.disconnect();
    };
  }, [user, playNotificationSound, addToast, fetchNotifications]);

  const value = {
    socket,
    connected,
    unreadCount,
    notifications,
    counts,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
