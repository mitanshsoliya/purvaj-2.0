import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/delivery
 * List delivery assignments.
 */
export const listDeliveries = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`d.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM delivery_orders d ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        d.*,
        o.order_number,
        o.total as order_total,
        s.shop_name,
        s.address as shop_address,
        s.city as shop_city,
        s.mobile as shop_mobile,
        u.name as driver_name,
        u.mobile as driver_mobile
      FROM delivery_orders d
      JOIN orders o ON d.order_id = o.id
      JOIN shops s ON o.shop_id = s.id
      LEFT JOIN users u ON d.delivery_staff_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        deliveries: result.rows,
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
 * POST /api/delivery/assign
 * Admin / Dispatcher assigns order for delivery.
 */
export const assignDelivery = async (req, res, next) => {
  try {
    const { order_id, delivery_staff_id, vehicle_number, route_info, notes } = req.body;

    if (!order_id) {
      return sendError(res, { message: 'order_id is required', statusCode: 400 });
    }

    // Generate 4-digit delivery OTP
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const result = await pool.query(
      `INSERT INTO delivery_orders (
        order_id, delivery_staff_id, vehicle_number, route_info,
        delivery_otp, status, notes
      ) VALUES ($1, $2, $3, $4, $5, 'assigned', $6)
      RETURNING *`,
      [order_id, delivery_staff_id || null, vehicle_number || null, route_info || null, deliveryOtp, notes || null]
    );

    // Update order status to dispatched if not already
    await pool.query(
      "UPDATE orders SET order_status = 'dispatched', dispatched_at = NOW(), updated_at = NOW() WHERE id = $1 AND order_status IN ('pending', 'confirmed', 'processing', 'packed')",
      [order_id]
    );

    return sendCreated(res, { data: { delivery: result.rows[0] }, message: 'Delivery assigned successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/delivery/:id/status
 * Update delivery status (picked_up, in_transit, delivered, failed).
 */
export const updateDeliveryStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, recipient_name, delivery_proof_url, notes } = req.body;

    const valid = ['assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned'];
    if (!valid.includes(status)) {
      return sendError(res, { message: `Invalid status. Allowed: ${valid.join(', ')}`, statusCode: 400 });
    }

    await client.query('BEGIN');

    const dRes = await client.query('SELECT * FROM delivery_orders WHERE id = $1 FOR UPDATE', [id]);
    if (dRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Delivery record not found', statusCode: 404 });
    }
    const current = dRes.rows[0];

    const result = await client.query(
      `UPDATE delivery_orders SET
        status = $1,
        recipient_name = COALESCE($2, recipient_name),
        delivery_proof_url = COALESCE($3, delivery_proof_url),
        notes = COALESCE($4, notes),
        picked_up_at = CASE WHEN $1 = 'picked_up' AND picked_up_at IS NULL THEN NOW() ELSE picked_up_at END,
        delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *`,
      [status, recipient_name || null, delivery_proof_url || null, notes || null, id]
    );

    // If delivered, update order status to delivered
    if (status === 'delivered') {
      await client.query(
        "UPDATE orders SET order_status = 'delivered', delivered_at = NOW(), updated_at = NOW() WHERE id = $1",
        [current.order_id]
      );
    }

    await client.query('COMMIT');

    await logAuditAction({
      userId: req.user?.id,
      action: 'DELIVERY_STATUS_UPDATED',
      entityType: 'delivery',
      entityId: id,
      newData: { status, order_id: current.order_id },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { delivery: result.rows[0] }, message: `Delivery status updated to ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export default {
  listDeliveries,
  assignDelivery,
  updateDeliveryStatus,
};
