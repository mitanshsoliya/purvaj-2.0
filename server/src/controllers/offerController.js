import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/offers
 * List offers. Filter active offers by default for shops.
 */
export const listOffers = async (req, res, next) => {
  try {
    const user = req.user;
    const { status, active_only } = req.query;
    const params = [];
    const conditions = [];

    // If active_only or not admin, only show active current offers
    const isAdmin = ['super_admin', 'admin'].includes(user?.role);
    if (!isAdmin || active_only === 'true') {
      conditions.push(`o.status = 'active' AND o.start_at <= NOW() AND o.end_at >= NOW()`);
    } else if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT o.*,
             COUNT(DISTINCT op.product_id)::int as product_count,
             COUNT(DISTINCT os.shop_id)::int as shop_count
      FROM offers o
      LEFT JOIN offer_products op ON o.id = op.offer_id
      LEFT JOIN offer_shops os ON o.id = os.offer_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.end_at ASC, o.created_at DESC
    `;

    const result = await pool.query(query, params);
    return sendSuccess(res, { data: { offers: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/offers/:id
 * Get single offer with products and target shops.
 */
export const getOfferById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const offerRes = await pool.query('SELECT * FROM offers WHERE id = $1', [id]);
    if (offerRes.rows.length === 0) {
      return sendError(res, { message: 'Offer not found', statusCode: 404 });
    }

    const offer = offerRes.rows[0];

    // Linked products
    const prodRes = await pool.query(
      `SELECT p.id, p.name, p.sku, p.selling_price
       FROM offer_products op
       JOIN products p ON op.product_id = p.id
       WHERE op.offer_id = $1`,
      [id]
    );

    // Linked shops
    const shopRes = await pool.query(
      `SELECT s.id, s.shop_name, s.city
       FROM offer_shops os
       JOIN shops s ON os.shop_id = s.id
       WHERE os.offer_id = $1`,
      [id]
    );

    return sendSuccess(res, {
      data: {
        offer: {
          ...offer,
          products: prodRes.rows,
          shops: shopRes.rows,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/offers
 * Admin creates a new promotion/scheme.
 */
export const createOffer = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      title, description, discount_type = 'percentage', discount_value = 0,
      minimum_order_value = 0, max_discount_amount, start_at, end_at,
      product_ids = [], shop_ids = [],
    } = req.body;

    if (!title || !start_at || !end_at) {
      return sendError(res, { message: 'Title, start_at, and end_at are required', statusCode: 400 });
    }

    await client.query('BEGIN');

    const offerRes = await client.query(
      `INSERT INTO offers (
        title, description, discount_type, discount_value,
        minimum_order_value, max_discount_amount, start_at, end_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING *`,
      [
        title, description || null, discount_type, discount_value,
        minimum_order_value, max_discount_amount || null, start_at, end_at
      ]
    );
    const offer = offerRes.rows[0];

    // Link products
    for (const pid of product_ids) {
      await client.query(
        'INSERT INTO offer_products (offer_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [offer.id, pid]
      );
    }

    // Link shops
    for (const sid of shop_ids) {
      await client.query(
        'INSERT INTO offer_shops (offer_id, shop_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [offer.id, sid]
      );
    }

    await client.query('COMMIT');

    await logAuditAction({
      userId: req.user?.id,
      action: 'OFFER_CREATED',
      entityType: 'offer',
      entityId: offer.id,
      newData: { title, discount_type, discount_value },
      ipAddress: req.ip,
    });

    return sendCreated(res, { data: { offer }, message: 'Offer created successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PUT /api/offers/:id
 * Admin updates an offer.
 */
export const updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, description, discount_type, discount_value,
      minimum_order_value, max_discount_amount, start_at, end_at, status
    } = req.body;

    const result = await pool.query(
      `UPDATE offers SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        discount_type = COALESCE($3, discount_type),
        discount_value = COALESCE($4, discount_value),
        minimum_order_value = COALESCE($5, minimum_order_value),
        max_discount_amount = COALESCE($6, max_discount_amount),
        start_at = COALESCE($7, start_at),
        end_at = COALESCE($8, end_at),
        status = COALESCE($9, status),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *`,
      [title, description, discount_type, discount_value, minimum_order_value, max_discount_amount, start_at, end_at, status, id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Offer not found', statusCode: 404 });
    }

    return sendSuccess(res, { data: { offer: result.rows[0] }, message: 'Offer updated successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/offers/:id
 * Admin deactivates offer.
 */
export const deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE offers SET status = 'inactive', updated_at = NOW() WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Offer not found', statusCode: 404 });
    }

    return sendSuccess(res, { message: 'Offer deactivated' });
  } catch (err) {
    next(err);
  }
};

export default {
  listOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
};
