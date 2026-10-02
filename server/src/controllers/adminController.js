import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

const SALT_ROUNDS = 12;

/**
 * GET /api/admin/shops
 * List all shops with optional filters.
 */
export const listShops = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    let whereClause = '';
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(s.shop_name ILIKE $${params.length} OR s.owner_name ILIKE $${params.length} OR s.gstin ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    params.push(parseInt(limit));
    params.push(offset);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM shops s ${whereClause}`,
      params.slice(0, params.length - 2)
    );

    const result = await pool.query(
      `SELECT s.*, u.name as user_name, u.email as user_email, u.is_active as user_active
       FROM shops s
       LEFT JOIN users u ON s.owner_user_id = u.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return sendSuccess(res, {
      data: {
        shops: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/shops/:id
 * Get detailed shop info including owner user.
 */
export const getShopDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.*, u.name as user_name, u.email as user_email, u.mobile as user_mobile,
              u.is_active as user_active, u.last_login_at
       FROM shops s
       LEFT JOIN users u ON s.owner_user_id = u.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Shop not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    return sendSuccess(res, { data: { shop: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/shops
 * Admin creates a shop (with user account).
 */
export const createShop = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const data = req.validated_body;
    await client.query('BEGIN');

    // Check if email already exists
    const existingUser = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [data.email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Email already registered', statusCode: 409, code: 'EMAIL_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(data.password || 'Purvaj@2026', SALT_ROUNDS);

    const userResult = await client.query(
      `INSERT INTO users (name, email, mobile, password_hash, role)
       VALUES ($1, $2, $3, $4, 'shop_owner')
       RETURNING id, name, email, role`,
      [data.owner_name, data.email, data.mobile, passwordHash]
    );
    const newUser = userResult.rows[0];

    const shopResult = await client.query(
      `INSERT INTO shops (owner_user_id, shop_name, owner_name, mobile, email, address, city, state, pincode, gstin,
                          credit_limit, payment_terms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [newUser.id, data.shop_name, data.owner_name, data.mobile, data.email,
       data.address || null, data.city || null, data.state || null,
       data.pincode || null, data.gstin || null,
       data.credit_limit || 0, data.payment_terms || 15,
       data.status || 'active']
    );

    await client.query('COMMIT');

    await logAuditAction({
      userId: req.user.id,
      action: 'SHOP_CREATED',
      entityType: 'shop',
      entityId: shopResult.rows[0].id,
      details: { shop_name: data.shop_name, owner_email: data.email },
      ipAddress: req.ip,
    });

    return sendCreated(res, { data: { user: newUser, shop: shopResult.rows[0] }, message: 'Shop created successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PUT /api/admin/shops/:id
 * Update shop details.
 */
export const updateShop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.validated_body;

    const fields = [];
    const values = [];
    let idx = 1;

    const allowedFields = ['shop_name', 'owner_name', 'mobile', 'email', 'address', 'city',
                           'state', 'pincode', 'gstin', 'credit_limit', 'payment_terms', 'notes'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${idx}`);
        values.push(data[field]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return sendError(res, { message: 'No fields to update', statusCode: 400, code: 'NO_UPDATE' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE shops SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Shop not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    await logAuditAction({
      userId: req.user.id,
      action: 'SHOP_UPDATED',
      entityType: 'shop',
      entityId: id,
      details: data,
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { shop: result.rows[0] }, message: 'Shop updated' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/shops/:id/approve
 */
export const approveShop = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE shops SET status = 'active', updated_at = NOW() WHERE id = $1 AND status = 'pending_approval'
       RETURNING id, shop_name, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Shop not found or not in pending state', statusCode: 400, code: 'INVALID_STATE' });
    }

    await logAuditAction({
      userId: req.user.id,
      action: 'SHOP_APPROVED',
      entityType: 'shop',
      entityId: id,
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { shop: result.rows[0] }, message: 'Shop approved successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/shops/:id/block
 */
export const blockShop = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE shops SET status = 'blocked', notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $1 AND status IN ('active', 'pending_approval')
       RETURNING id, shop_name, status`,
      [id, reason || null]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Shop not found or already blocked', statusCode: 400, code: 'INVALID_STATE' });
    }

    await logAuditAction({
      userId: req.user.id,
      action: 'SHOP_BLOCKED',
      entityType: 'shop',
      entityId: id,
      details: { reason },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { shop: result.rows[0] }, message: 'Shop blocked' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/shops/:id/reactivate
 */
export const reactivateShop = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE shops SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND status IN ('blocked', 'suspended', 'inactive')
       RETURNING id, shop_name, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Shop not found or already active', statusCode: 400, code: 'INVALID_STATE' });
    }

    await logAuditAction({
      userId: req.user.id,
      action: 'SHOP_REACTIVATED',
      entityType: 'shop',
      entityId: id,
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { shop: result.rows[0] }, message: 'Shop reactivated' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/shops/:id/reset-password
 */
export const resetShopPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return sendError(res, { message: 'New password must be at least 8 characters', statusCode: 400, code: 'WEAK_PASSWORD' });
    }

    // Get shop's owner user_id
    const shopResult = await pool.query('SELECT owner_user_id FROM shops WHERE id = $1', [id]);
    if (shopResult.rows.length === 0) {
      return sendError(res, { message: 'Shop not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    const ownerId = shopResult.rows[0].owner_user_id;
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, ownerId]);

    await logAuditAction({
      userId: req.user.id,
      action: 'SHOP_PASSWORD_RESET',
      entityType: 'shop',
      entityId: id,
      details: { owner_user_id: ownerId },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { message: 'Shop owner password reset successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/dashboard/stats
 * Overview KPIs for admin dashboard.
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const [shops, orders, revenue, lowStock] = await Promise.all([
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE status = 'active') AS active_shops,
        COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending_shops,
        COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_shops,
        COUNT(*) AS total_shops
        FROM shops`),
      pool.query(`SELECT
        COUNT(*) FILTER (WHERE order_status = 'pending') AS pending_orders,
        COUNT(*) FILTER (WHERE order_status = 'confirmed') AS confirmed_orders,
        COUNT(*) FILTER (WHERE order_status = 'processing') AS processing_orders,
        COUNT(*) FILTER (WHERE order_status = 'dispatched') AS dispatched_orders,
        COUNT(*) FILTER (WHERE order_status = 'delivered') AS delivered_orders,
        COUNT(*) AS total_orders
        FROM orders`),
      pool.query(`SELECT
        COALESCE(SUM(total), 0) AS total_revenue,
        COALESCE(SUM(total) FILTER (WHERE created_at >= CURRENT_DATE), 0) AS today_revenue
        FROM orders WHERE order_status NOT IN ('cancelled', 'returned')`),
      pool.query(`SELECT COUNT(*) AS low_stock_count FROM inventory
        WHERE current_stock <= minimum_stock AND minimum_stock > 0`),
    ]);

    return sendSuccess(res, {
      data: {
        shops: shops.rows[0],
        orders: orders.rows[0],
        revenue: revenue.rows[0],
        inventory: lowStock.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/brands
 * List all brands.
 */
export const listBrands = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.*, COUNT(p.id)::int as product_count
       FROM brands b
       LEFT JOIN products p ON b.id = p.brand_id AND p.status = 'active'
       WHERE b.status != 'deleted'
       GROUP BY b.id
       ORDER BY b.name ASC`
    );
    return sendSuccess(res, { data: { brands: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/brands
 * Create brand.
 */
export const createBrand = async (req, res, next) => {
  try {
    const { name, slug, description, logo_url } = req.body;
    if (!name) return sendError(res, { message: 'Brand name is required', statusCode: 400 });

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const result = await pool.query(
      `INSERT INTO brands (name, slug, description, logo_url, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [name, finalSlug, description || null, logo_url || null]
    );

    return sendCreated(res, { data: { brand: result.rows[0] }, message: 'Brand created successfully' });
  } catch (err) {
    next(err);
  }
};

export default {
  listShops,
  getShopDetail,
  createShop,
  updateShop,
  approveShop,
  blockShop,
  reactivateShop,
  resetShopPassword,
  getDashboardStats,
  listBrands,
  createBrand,
};
