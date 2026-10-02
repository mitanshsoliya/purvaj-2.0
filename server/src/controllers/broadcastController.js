import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/broadcasts
 * List broadcasts / announcements with detailed delivery and read metrics.
 */
export const listBroadcasts = async (req, res, next) => {
  try {
    const user = req.user;
    const isAdmin = ['super_admin', 'admin'].includes(user.role);

    if (isAdmin) {
      const query = `
        SELECT 
          b.*,
          u.name as sender_name,
          sg.name as target_group_name,
          COUNT(br.user_id)::int as total_recipients,
          COUNT(br.delivered_at)::int as delivered_count,
          COUNT(br.read_at)::int as read_count,
          (COUNT(br.user_id) - COUNT(br.read_at))::int as unread_count
        FROM broadcasts b
        LEFT JOIN users u ON b.sender_user_id = u.id
        LEFT JOIN shop_groups sg ON b.target_group_id = sg.id
        LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id
        WHERE b.status = 'active'
        GROUP BY b.id, u.name, sg.name
        ORDER BY b.created_at DESC
      `;

      const result = await pool.query(query);

      // Enhance with human-friendly target display
      const formatted = result.rows.map((b) => {
        let targetDisplay = 'All Shops';
        if (b.target_type === 'SHOP_GROUP') {
          targetDisplay = b.target_group_name ? `Group: ${b.target_group_name}` : 'Shop Group';
        } else if (b.target_type === 'SELECTED_SHOPS') {
          const count = Array.isArray(b.target_shop_ids) ? b.target_shop_ids.length : b.total_recipients;
          targetDisplay = `${count} Selected Shops`;
        }
        return {
          ...b,
          target_display: targetDisplay,
        };
      });

      return sendSuccess(res, { data: { broadcasts: formatted } });
    }

    // Shop view: Only announcements targeted to this shop's user
    const query = `
      SELECT b.*, u.name as sender_name, br.read_at, br.delivered_at
      FROM broadcasts b
      LEFT JOIN users u ON b.sender_user_id = u.id
      JOIN broadcast_recipients br ON br.broadcast_id = b.id AND br.user_id = $1
      WHERE b.status = 'active'
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(query, [user.id]);
    return sendSuccess(res, { data: { broadcasts: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/broadcasts/:id
 * Get single broadcast with complete recipient breakdown (Admin view).
 */
export const getBroadcastById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const broadRes = await pool.query(
      `SELECT b.*, u.name as sender_name, sg.name as target_group_name
       FROM broadcasts b
       LEFT JOIN users u ON b.sender_user_id = u.id
       LEFT JOIN shop_groups sg ON b.target_group_id = sg.id
       WHERE b.id = $1`,
      [id]
    );

    if (broadRes.rows.length === 0) {
      return sendError(res, { message: 'Broadcast not found', statusCode: 404 });
    }

    const broadcast = broadRes.rows[0];

    // Query recipient breakdown
    const recipRes = await pool.query(
      `SELECT 
         br.user_id,
         br.delivered_at,
         br.read_at,
         u.name as recipient_name,
         u.mobile as recipient_mobile,
         s.id as shop_id,
         s.shop_name,
         s.city as shop_city,
         CASE 
           WHEN br.read_at IS NOT NULL THEN 'READ'
           WHEN br.delivered_at IS NOT NULL THEN 'DELIVERED'
           ELSE 'PENDING'
         END as delivery_status
       FROM broadcast_recipients br
       JOIN users u ON br.user_id = u.id
       LEFT JOIN shops s ON s.owner_user_id = u.id
       WHERE br.broadcast_id = $1
       ORDER BY br.read_at DESC NULLS LAST, s.shop_name ASC`,
      [id]
    );

    const recipients = recipRes.rows;
    const totalRecipients = recipients.length;
    const deliveredCount = recipients.filter((r) => r.delivered_at).length;
    const readCount = recipients.filter((r) => r.read_at).length;
    const unreadCount = totalRecipients - readCount;

    return sendSuccess(res, {
      data: {
        broadcast: {
          ...broadcast,
          stats: {
            total: totalRecipients,
            delivered: deliveredCount,
            read: readCount,
            unread: unreadCount,
            readPercentage: totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0,
            deliveryPercentage: totalRecipients > 0 ? Math.round((deliveredCount / totalRecipients) * 100) : 0,
          },
          recipients,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/broadcasts
 * Admin composes and sends broadcast message to all, selected, or grouped shops.
 * STRICT SECURITY:
 * - Emits real-time Socket.IO notification ONLY to authorized rooms.
 * - Stores notifications in DB for full offline persistence.
 */
export const createBroadcast = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const {
      title,
      message,
      priority = 'normal',
      target_type = 'ALL_SHOPS',
      target_group_id,
      target_shop_ids = [],
      attachment_url,
      action_label,
      action_url,
      scheduled_at,
    } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return sendError(res, { message: 'Title and message are required', statusCode: 400 });
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const safePriority = validPriorities.includes(priority) ? priority : 'normal';

    const validTargets = ['ALL_SHOPS', 'SELECTED_SHOPS', 'SHOP_GROUP'];
    if (!validTargets.includes(target_type)) {
      return sendError(res, { message: 'Invalid target_type. Allowed: ALL_SHOPS, SELECTED_SHOPS, SHOP_GROUP', statusCode: 400 });
    }

    await client.query('BEGIN');

    // 1. Insert Broadcast record
    const broadRes = await client.query(
      `INSERT INTO broadcasts (
        title, message, priority, sender_user_id, target_type, target_group_id,
        target_shop_ids, attachment_url, action_label, action_url, scheduled_at, sent_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), 'active')
      RETURNING *`,
      [
        title.trim(),
        message.trim(),
        safePriority,
        user.id,
        target_type,
        target_type === 'SHOP_GROUP' ? target_group_id || null : null,
        target_type === 'SELECTED_SHOPS' ? JSON.stringify(target_shop_ids) : '[]',
        attachment_url || null,
        action_label || null,
        action_url || null,
        scheduled_at || null,
      ]
    );
    const broadcast = broadRes.rows[0];

    // 2. Resolve target recipients (shops and user accounts)
    let recipientShops = [];
    if (target_type === 'ALL_SHOPS') {
      const q = await client.query(
        "SELECT id, owner_user_id, shop_name FROM shops WHERE status = 'active' AND owner_user_id IS NOT NULL"
      );
      recipientShops = q.rows;
    } else if (target_type === 'SELECTED_SHOPS' && Array.isArray(target_shop_ids) && target_shop_ids.length > 0) {
      const q = await client.query(
        'SELECT id, owner_user_id, shop_name FROM shops WHERE id = ANY($1::uuid[]) AND owner_user_id IS NOT NULL',
        [target_shop_ids]
      );
      recipientShops = q.rows;
    } else if (target_type === 'SHOP_GROUP' && target_group_id) {
      const q = await client.query(
        `SELECT DISTINCT s.id, s.owner_user_id, s.shop_name
         FROM shop_group_members sgm
         JOIN shops s ON sgm.shop_id = s.id
         WHERE sgm.shop_group_id = $1 AND s.owner_user_id IS NOT NULL`,
        [target_group_id]
      );
      recipientShops = q.rows;
    }

    if (recipientShops.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, {
        message: 'No active shops or recipient users found for selected audience',
        statusCode: 400,
      });
    }

    // 3. Persist notifications & recipients in DB (Offline Persistence)
    const notificationPayloads = [];

    for (const shop of recipientShops) {
      const recipientUserId = shop.owner_user_id;

      // Broadcast recipient entry
      await client.query(
        `INSERT INTO broadcast_recipients (broadcast_id, user_id, delivered_at)
         VALUES ($1, $2, NULL)
         ON CONFLICT (broadcast_id, user_id) DO NOTHING`,
        [broadcast.id, recipientUserId]
      );

      // Notification entry
      const notifRes = await client.query(
        `INSERT INTO notifications (
          recipient_user_id, title, message, type, priority,
          action_url, broadcast_id, attachment_url, action_label, is_read
        ) VALUES ($1, $2, $3, 'broadcast', $4, $5, $6, $7, $8, false)
        RETURNING *`,
        [
          recipientUserId,
          title.trim(),
          message.trim(),
          safePriority,
          action_url || '/shop/notifications',
          broadcast.id,
          attachment_url || null,
          action_label || null,
        ]
      );

      notificationPayloads.push({
        shopId: shop.id,
        shopName: shop.shop_name,
        userId: recipientUserId,
        notification: notifRes.rows[0],
      });
    }

    await client.query('COMMIT');

    // 4. Secure Real-Time Socket.IO Emission
    if (req.io) {
      if (target_type === 'ALL_SHOPS') {
        // Broadcast to all verified shops room
        req.io.to('all_shops_room').emit('new_notification', {
          broadcast_id: broadcast.id,
          title: broadcast.title,
          message: broadcast.message,
          priority: broadcast.priority,
          attachment_url: broadcast.attachment_url,
          action_label: broadcast.action_label,
          action_url: broadcast.action_url,
          created_at: broadcast.created_at,
          sender_name: user.name || 'Central Warehouse',
        });
      } else {
        // STRICT SECURITY: Emit ONLY to the specific authorized shop rooms and user rooms
        for (const item of notificationPayloads) {
          req.io.to(`shop_${item.shopId}`).to(`user_${item.userId}`).emit('new_notification', {
            notification: item.notification,
            broadcast_id: broadcast.id,
            title: broadcast.title,
            message: broadcast.message,
            priority: broadcast.priority,
            attachment_url: broadcast.attachment_url,
            action_label: broadcast.action_label,
            action_url: broadcast.action_url,
            created_at: item.notification.created_at,
            sender_name: user.name || 'Central Warehouse',
          });
        }
      }

      // Live Admin stream update
      req.io.to('admin_room').emit('broadcast_sent', {
        id: broadcast.id,
        title: broadcast.title,
        priority: broadcast.priority,
        target_type: broadcast.target_type,
        recipients_count: notificationPayloads.length,
        sent_at: broadcast.sent_at,
      });
    }

    await logAuditAction({
      userId: user.id,
      action: 'BROADCAST_SENT',
      entityType: 'broadcast',
      entityId: broadcast.id,
      newData: {
        title: broadcast.title,
        target_type: broadcast.target_type,
        recipients: notificationPayloads.length,
      },
      ipAddress: req.ip,
    });

    return sendCreated(res, {
      data: {
        broadcast,
        recipients_count: notificationPayloads.length,
      },
      message: `Broadcast successfully sent to ${notificationPayloads.length} shops`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/broadcasts/stats/summary
 * KPI metrics for Broadcast Center Admin
 */
export const getBroadcastSummary = async (req, res, next) => {
  try {
    const totalBroadcastsRes = await pool.query("SELECT COUNT(*)::int as total FROM broadcasts WHERE status = 'active'");
    const recipientStatsRes = await pool.query(
      `SELECT 
         COUNT(*)::int as total_sent,
         COUNT(delivered_at)::int as total_delivered,
         COUNT(read_at)::int as total_read
       FROM broadcast_recipients`
    );

    const stats = recipientStatsRes.rows[0];
    const totalSent = stats.total_sent || 0;
    const totalDelivered = stats.total_delivered || 0;
    const totalRead = stats.total_read || 0;
    const totalUnread = totalSent - totalRead;

    return sendSuccess(res, {
      data: {
        totalBroadcasts: totalBroadcastsRes.rows[0].total,
        totalSent,
        totalDelivered,
        totalRead,
        totalUnread,
        deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100,
        readRate: totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  listBroadcasts,
  getBroadcastById,
  createBroadcast,
  getBroadcastSummary,
};
