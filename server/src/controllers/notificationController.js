import pool from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * GET /api/notifications
 * Get authenticated user's notifications + unread count.
 */
export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 30 } = req.query;

    const notifsRes = await pool.query(
      `SELECT * FROM notifications
       WHERE recipient_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as unread_count
       FROM notifications
       WHERE recipient_user_id = $1 AND is_read = false`,
      [userId]
    );

    return sendSuccess(res, {
      data: {
        notifications: notifsRes.rows,
        unreadCount: countRes.rows[0].unread_count,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read.
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND recipient_user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Notification not found', statusCode: 404 });
    }

    return sendSuccess(res, { data: { notification: result.rows[0] }, message: 'Marked as read' });
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

    await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE recipient_user_id = $1 AND is_read = false`,
      [userId]
    );

    return sendSuccess(res, { message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

export default {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
};
