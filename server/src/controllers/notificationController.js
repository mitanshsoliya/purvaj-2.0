import pool from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * GET /api/notifications
 * Get authenticated user's notifications + unread count with category filtering.
 * Supports types: all, unread, broadcast (announcements), order, payment, stock
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type = 'all', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const conditions = ['n.recipient_user_id = $1'];
    const params = [userId];

    if (type === 'unread') {
      conditions.push('n.is_read = false');
    } else if (type === 'broadcast' || type === 'announcements') {
      conditions.push("n.type = 'broadcast'");
    } else if (type === 'orders' || type === 'order') {
      conditions.push("n.type = 'order'");
    } else if (type === 'payments' || type === 'payment') {
      conditions.push("n.type = 'payment'");
    } else if (type === 'stock') {
      conditions.push("n.type = 'stock'");
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        n.*,
        b.sender_user_id,
        u.name as sender_name
      FROM notifications n
      LEFT JOIN broadcasts b ON n.broadcast_id = b.id
      LEFT JOIN users u ON b.sender_user_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    // Dynamic unread count
    const unreadCountRes = await pool.query(
      'SELECT COUNT(*)::int as unread_count FROM notifications WHERE recipient_user_id = $1 AND is_read = false',
      [userId]
    );

    // Counts per category for frontend filter tab badges
    const categoryCountsRes = await pool.query(
      `SELECT 
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE is_read = false)::int as unread,
         COUNT(*) FILTER (WHERE type = 'broadcast')::int as announcements,
         COUNT(*) FILTER (WHERE type = 'order')::int as orders,
         COUNT(*) FILTER (WHERE type = 'payment')::int as payments,
         COUNT(*) FILTER (WHERE type = 'stock')::int as stock
       FROM notifications
       WHERE recipient_user_id = $1`,
      [userId]
    );

    return sendSuccess(res, {
      data: {
        notifications: result.rows,
        unreadCount: unreadCountRes.rows[0].unread_count,
        counts: categoryCountsRes.rows[0] || {},
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read and reconcile broadcast read metrics.
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND recipient_user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Notification not found', statusCode: 404 });
    }

    const notif = result.rows[0];

    // Reconcile broadcast_recipients read_at if linked
    if (notif.broadcast_id) {
      await pool.query(
        `UPDATE broadcast_recipients
         SET read_at = NOW()
         WHERE broadcast_id = $1 AND user_id = $2 AND read_at IS NULL`,
        [notif.broadcast_id, userId]
      );
    }

    // Get fresh unread count
    const countRes = await pool.query(
      'SELECT COUNT(*)::int as unread_count FROM notifications WHERE recipient_user_id = $1 AND is_read = false',
      [userId]
    );
    const unreadCount = countRes.rows[0].unread_count;

    // Real-time unread badge synchronization over Socket.IO
    if (req.io) {
      req.io.to(`user_${userId}`).emit('unread_count_updated', { unreadCount });
      // Notify admin live dashboard if linked to a broadcast
      if (notif.broadcast_id) {
        req.io.to('admin_room').emit('broadcast_recipient_read', {
          broadcast_id: notif.broadcast_id,
          user_id: userId,
        });
      }
    }

    return sendSuccess(res, {
      data: { notification: notif, unreadCount },
      message: 'Marked as read',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user.
 */
export const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find all unread broadcast IDs for user
    const unreadBroadcasts = await pool.query(
      `SELECT DISTINCT broadcast_id FROM notifications 
       WHERE recipient_user_id = $1 AND is_read = false AND broadcast_id IS NOT NULL`,
      [userId]
    );

    await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE recipient_user_id = $1 AND is_read = false`,
      [userId]
    );

    // Update broadcast_recipients
    if (unreadBroadcasts.rows.length > 0) {
      const bIds = unreadBroadcasts.rows.map((r) => r.broadcast_id);
      await pool.query(
        `UPDATE broadcast_recipients SET read_at = NOW()
         WHERE user_id = $1 AND broadcast_id = ANY($2::uuid[]) AND read_at IS NULL`,
        [userId, bIds]
      );
    }

    // Real-time Socket.IO emission
    if (req.io) {
      req.io.to(`user_${userId}`).emit('unread_count_updated', { unreadCount: 0 });
    }

    return sendSuccess(res, {
      data: { unreadCount: 0 },
      message: 'All notifications marked as read',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/:id/delivered
 * Acknowledge notification receipt / delivery
 */
export const acknowledgeDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notifRes = await pool.query(
      'SELECT id, broadcast_id FROM notifications WHERE id = $1 AND recipient_user_id = $2',
      [id, userId]
    );

    if (notifRes.rows.length > 0 && notifRes.rows[0].broadcast_id) {
      await pool.query(
        `UPDATE broadcast_recipients 
         SET delivered_at = NOW() 
         WHERE broadcast_id = $1 AND user_id = $2 AND delivered_at IS NULL`,
        [notifRes.rows[0].broadcast_id, userId]
      );
    }

    return sendSuccess(res, { message: 'Delivery acknowledged' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/admin/all
 * Admin lists all platform notifications
 */
export const listAllNotificationsAdmin = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 50, search } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (type && type !== 'all') {
      params.push(type);
      conditions.push(`n.type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(n.title ILIKE $${params.length} OR n.message ILIKE $${params.length} OR u.name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM notifications n JOIN users u ON n.recipient_user_id = u.id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        n.*,
        u.name as recipient_name,
        u.mobile as recipient_mobile,
        s.shop_name
      FROM notifications n
      JOIN users u ON n.recipient_user_id = u.id
      LEFT JOIN shops s ON s.owner_user_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        notifications: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/messages/logs
 * Admin reviews WhatsApp & SMS delivery records, failure reasons, and status.
 */
export const getMessageLogs = async (req, res, next) => {
  try {
    const { channel, status, event_type, search, page = 1, limit = 25 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (channel && channel !== 'all') {
      params.push(channel);
      conditions.push(`ml.channel = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`ml.status = $${params.length}`);
    }

    if (event_type && event_type !== 'all') {
      params.push(event_type);
      conditions.push(`ml.event_type = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(ml.recipient ILIKE $${pIdx} OR ml.content ILIKE $${pIdx} OR s.shop_name ILIKE $${pIdx})`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM message_logs ml LEFT JOIN shops s ON ml.shop_id = s.id ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        ml.*,
        s.shop_name,
        o.order_number
      FROM message_logs ml
      LEFT JOIN shops s ON ml.shop_id = s.id
      LEFT JOIN orders o ON ml.order_id = o.id
      ${whereClause}
      ORDER BY ml.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        logs: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/messages/status
 * Check configured WhatsApp, SMS, and Gateway provider architecture status.
 */
export const getMessagingStatus = async (req, res, next) => {
  try {
    const isWhatsAppConfigured = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
    const isSmsConfigured = Boolean(process.env.SMS_AUTH_KEY);
    const isPaymentConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

    return sendSuccess(res, {
      data: {
        whatsapp: {
          provider: isWhatsAppConfigured ? 'meta' : 'sandbox',
          configured: isWhatsAppConfigured,
          mode: isWhatsAppConfigured ? 'production' : 'development/sandbox',
          sender: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'SANDBOX_WHATSAPP',
        },
        sms: {
          provider: isSmsConfigured ? 'msg91' : 'sandbox',
          configured: isSmsConfigured,
          mode: isSmsConfigured ? 'production' : 'development/sandbox',
          senderId: process.env.SMS_SENDER_ID || 'PURVAJ',
        },
        paymentGateway: {
          provider: isPaymentConfigured ? 'razorpay' : 'sandbox',
          configured: isPaymentConfigured,
          mode: isPaymentConfigured ? 'production' : 'test/sandbox',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  acknowledgeDelivery,
  listAllNotificationsAdmin,
  getMessageLogs,
  getMessagingStatus,
};

