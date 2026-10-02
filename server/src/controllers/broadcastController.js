import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/broadcasts
 * List broadcasts / announcements.
 */
export const listBroadcasts = async (req, res, next) => {
  try {
    const user = req.user;
    const isAdmin = ['super_admin', 'admin'].includes(user.role);

    const query = isAdmin
      ? `SELECT b.*, u.name as sender_name,
                COUNT(br.user_id)::int as recipient_count
         FROM broadcasts b
         LEFT JOIN users u ON b.sender_user_id = u.id
         LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id
         WHERE b.status = 'active'
         GROUP BY b.id, u.name
         ORDER BY b.created_at DESC`
      : `SELECT b.*, u.name as sender_name
         FROM broadcasts b
         LEFT JOIN users u ON b.sender_user_id = u.id
         LEFT JOIN broadcast_recipients br ON br.broadcast_id = b.id AND br.user_id = $1
         WHERE b.status = 'active' AND (b.target_type = 'ALL_SHOPS' OR br.user_id IS NOT NULL)
         ORDER BY b.created_at DESC`;

    const params = isAdmin ? [] : [user.id];
    const result = await pool.query(query, params);

    return sendSuccess(res, { data: { broadcasts: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/broadcasts
 * Admin sends broadcast message to all or targeted shops.
 */
export const createBroadcast = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const { title, message, priority = 'normal', target_type = 'ALL_SHOPS', target_group_id } = req.body;

    if (!title || !message) {
      return sendError(res, { message: 'Title and message are required', statusCode: 400 });
    }

    await client.query('BEGIN');

    const broadRes = await client.query(
      `INSERT INTO broadcasts (title, message, priority, sender_user_id, target_type, target_group_id, sent_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'active')
       RETURNING *`,
      [title, message, priority, user.id, target_type, target_group_id || null]
    );
    const broadcast = broadRes.rows[0];

    // Determine target users
    let targetUsers = [];
    if (target_type === 'ALL_SHOPS') {
      const uRes = await client.query("SELECT id FROM users WHERE role = 'shop_owner' AND is_active = true");
      targetUsers = uRes.rows.map(r => r.id);
    } else if (target_type === 'SHOP_GROUP' && target_group_id) {
      const uRes = await client.query(
        `SELECT DISTINCT s.owner_user_id as id
         FROM shop_group_members sgm
         JOIN shops s ON sgm.shop_id = s.id
         WHERE sgm.shop_group_id = $1`,
        [target_group_id]
      );
      targetUsers = uRes.rows.map(r => r.id);
    }

    // Insert broadcast recipients & notifications
    for (const uid of targetUsers) {
      await client.query(
        'INSERT INTO broadcast_recipients (broadcast_id, user_id, delivered_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
        [broadcast.id, uid]
      );
      await client.query(
        `INSERT INTO notifications (recipient_user_id, title, message, type, priority, action_url)
         VALUES ($1, $2, $3, 'system', $4, '/shop/notifications')`,
        [uid, title, message, priority]
      );
    }

    await client.query('COMMIT');

    // Emit live socket announcement
    if (req.io) {
      req.io.emit('new_broadcast', {
        id: broadcast.id,
        title,
        message,
        priority,
      });
    }

    await logAuditAction({
      userId: user.id,
      action: 'BROADCAST_SENT',
      entityType: 'broadcast',
      entityId: broadcast.id,
      newData: { title, target_type, recipients: targetUsers.length },
      ipAddress: req.ip,
    });

    return sendCreated(res, {
      data: { broadcast, recipientCount: targetUsers.length },
      message: `Broadcast sent to ${targetUsers.length} shops`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export default {
  listBroadcasts,
  createBroadcast,
};
