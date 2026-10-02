import pool from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/shops/profile
 * Get current shop owner's shop profile with credit balance.
 */
export const getMyShop = async (req, res, next) => {
  try {
    const user = req.user;
    let shopId = user.shop?.shop_id || user.shop?.id;

    if (!shopId) {
      // If admin or demo preview without direct shop link, resolve primary registered shop
      const fallback = await pool.query('SELECT id FROM shops ORDER BY created_at ASC LIMIT 1');
      if (fallback.rows.length > 0) {
        shopId = fallback.rows[0].id;
      } else {
        return sendError(res, { message: 'No shop associated with this account', statusCode: 404 });
      }
    }

    const result = await pool.query(
      `SELECT s.*, 
              (s.credit_limit - s.credit_used) as available_credit,
              u.name as owner_account_name,
              u.email as owner_account_email
       FROM shops s
       JOIN users u ON s.owner_user_id = u.id
       WHERE s.id = $1`,
      [shopId]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Shop not found', statusCode: 404 });
    }

    return sendSuccess(res, { data: { shop: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/shops/profile
 * Shop owner updates contact/address details.
 * Never allow modifying credit limit, status, or owner_user_id.
 */
export const updateMyShop = async (req, res, next) => {
  try {
    const user = req.user;
    const shopId = user.shop?.shop_id || user.shop?.id;

    if (!shopId) {
      return sendError(res, { message: 'No shop associated with this account', statusCode: 404 });
    }

    const { shop_name, owner_name, mobile, email, address, city, state, pincode, gstin, pan } = req.body;

    const result = await pool.query(
      `UPDATE shops SET
        shop_name = COALESCE($1, shop_name),
        owner_name = COALESCE($2, owner_name),
        mobile = COALESCE($3, mobile),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        pincode = COALESCE($8, pincode),
        gstin = COALESCE($9, gstin),
        pan = COALESCE($10, pan),
        updated_at = NOW()
      WHERE id = $11
      RETURNING *`,
      [shop_name, owner_name, mobile, email, address, city, state, pincode, gstin, pan, shopId]
    );

    await logAuditAction({
      userId: user.id,
      action: 'SHOP_PROFILE_UPDATED',
      entityType: 'shop',
      entityId: shopId,
      newData: result.rows[0],
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { shop: result.rows[0] }, message: 'Shop profile updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/shops/ledger
 * Get ledger / udhaar account statement for the shop.
 */
export const getShopLedger = async (req, res, next) => {
  try {
    const user = req.user;
    let shopId = user.shop?.shop_id || user.shop?.id;

    // If admin is viewing, they can pass ?shop_id=...
    if (['super_admin', 'admin'].includes(user.role) && req.query.shop_id) {
      shopId = req.query.shop_id;
    }

    if (!shopId) {
      const fallback = await pool.query('SELECT id FROM shops ORDER BY created_at ASC LIMIT 1');
      if (fallback.rows.length > 0) {
        shopId = fallback.rows[0].id;
      } else {
        return sendError(res, { message: 'Shop ID required', statusCode: 400 });
      }
    }

    const { page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const countResult = await pool.query('SELECT COUNT(*) FROM shop_ledger WHERE shop_id = $1', [shopId]);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM shop_ledger
       WHERE shop_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [shopId, parseInt(limit), offset]
    );

    // Get current shop credit info
    const shopRes = await pool.query(
      'SELECT credit_limit, credit_used, (credit_limit - credit_used) as available_credit FROM shops WHERE id = $1',
      [shopId]
    );

    return sendSuccess(res, {
      data: {
        ledger: result.rows,
        summary: shopRes.rows[0] || null,
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
 * GET /api/shops/notification-preferences
 * Retrieve shop user's channel and event notification preferences.
 */
export const getNotificationPreferences = async (req, res, next) => {
  try {
    const user = req.user;
    let shopId = user.shop?.shop_id || user.shop?.id;

    if (!shopId) {
      const fallback = await pool.query('SELECT id FROM shops ORDER BY created_at ASC LIMIT 1');
      if (fallback.rows.length > 0) shopId = fallback.rows[0].id;
      else return sendError(res, { message: 'Shop ID required', statusCode: 400 });
    }

    let prefRes = await pool.query('SELECT * FROM notification_preferences WHERE shop_id = $1', [shopId]);
    if (prefRes.rows.length === 0) {
      // Create defaults
      prefRes = await pool.query(
        `INSERT INTO notification_preferences (shop_id, channel_in_app, channel_whatsapp, channel_sms, order_updates, payment_reminders, promotional_offers)
         VALUES ($1, true, true, true, true, true, true)
         RETURNING *`,
        [shopId]
      );
    }

    return sendSuccess(res, {
      data: { preferences: prefRes.rows[0] },
      message: 'Notification preferences loaded',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/shops/notification-preferences
 * Update notification preferences. Critical tax/invoice records cannot be completely turned off.
 */
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const user = req.user;
    let shopId = user.shop?.shop_id || user.shop?.id;

    if (!shopId) {
      const fallback = await pool.query('SELECT id FROM shops ORDER BY created_at ASC LIMIT 1');
      if (fallback.rows.length > 0) shopId = fallback.rows[0].id;
      else return sendError(res, { message: 'Shop ID required', statusCode: 400 });
    }

    const {
      channel_whatsapp,
      channel_sms,
      channel_in_app,
      order_updates,
      payment_reminders,
      promotional_offers,
    } = req.body;

    // Security rule: channel_in_app for legal & financial transactional notifications must remain enabled
    const safeInApp = channel_in_app !== undefined ? Boolean(channel_in_app) : true;

    const result = await pool.query(
      `INSERT INTO notification_preferences (
        shop_id, channel_in_app, channel_whatsapp, channel_sms,
        order_updates, payment_reminders, promotional_offers, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (shop_id) DO UPDATE SET
        channel_in_app = EXCLUDED.channel_in_app,
        channel_whatsapp = EXCLUDED.channel_whatsapp,
        channel_sms = EXCLUDED.channel_sms,
        order_updates = EXCLUDED.order_updates,
        payment_reminders = EXCLUDED.payment_reminders,
        promotional_offers = EXCLUDED.promotional_offers,
        updated_at = NOW()
      RETURNING *`,
      [
        shopId,
        safeInApp,
        channel_whatsapp !== undefined ? Boolean(channel_whatsapp) : true,
        channel_sms !== undefined ? Boolean(channel_sms) : true,
        order_updates !== undefined ? Boolean(order_updates) : true,
        payment_reminders !== undefined ? Boolean(payment_reminders) : true,
        promotional_offers !== undefined ? Boolean(promotional_offers) : true,
      ]
    );

    return sendSuccess(res, {
      data: { preferences: result.rows[0] },
      message: 'Notification preferences updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getMyShop,
  updateMyShop,
  getShopLedger,
  getNotificationPreferences,
  updateNotificationPreferences,
};

