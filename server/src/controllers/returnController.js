import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/returns
 * List return requests. Shops view their own; admin views all.
 */
export const listReturns = async (req, res, next) => {
  try {
    const user = req.user;
    const { status, shop_id, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      params.push(myShopId);
      conditions.push(`r.shop_id = $${params.length}`);
    } else if (shop_id) {
      params.push(shop_id);
      conditions.push(`r.shop_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM returns r ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        r.*,
        s.shop_name,
        o.order_number,
        COUNT(ri.id)::int as item_count
      FROM returns r
      JOIN shops s ON r.shop_id = s.id
      JOIN orders o ON r.order_id = o.id
      LEFT JOIN return_items ri ON ri.return_id = r.id
      ${whereClause}
      GROUP BY r.id, s.shop_name, o.order_number
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        returns: result.rows,
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
 * GET /api/returns/:id
 * Get single return request with items.
 */
export const getReturnById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const returnRes = await pool.query(
      `SELECT r.*, s.shop_name, o.order_number
       FROM returns r
       JOIN shops s ON r.shop_id = s.id
       JOIN orders o ON r.order_id = o.id
       WHERE r.id = $1`,
      [id]
    );

    if (returnRes.rows.length === 0) {
      return sendError(res, { message: 'Return not found', statusCode: 404 });
    }

    const ret = returnRes.rows[0];

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      if (ret.shop_id !== myShopId) {
        return sendError(res, { message: 'Access denied', statusCode: 403 });
      }
    }

    const itemsRes = await pool.query(
      `SELECT ri.*, p.name as product_name, p.sku
       FROM return_items ri
       LEFT JOIN products p ON ri.product_id = p.id
       WHERE ri.return_id = $1`,
      [id]
    );

    return sendSuccess(res, { data: { return: { ...ret, items: itemsRes.rows } } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/returns
 * Shop owner requests a return for delivered items.
 */
export const createReturn = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const { order_id, reason, items } = req.body;

    const myShopId = user.shop?.shop_id || user.shop?.id;
    if (!myShopId) {
      return sendError(res, { message: 'Shop profile required', statusCode: 403 });
    }

    if (!order_id || !reason || !items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, { message: 'order_id, reason, and items are required', statusCode: 400 });
    }

    await client.query('BEGIN');

    // Verify order belongs to shop
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND shop_id = $2', [order_id, myShopId]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Order not found for this shop', statusCode: 404 });
    }

    const returnRes = await client.query(
      `INSERT INTO returns (order_id, shop_id, reason, status)
       VALUES ($1, $2, $3, 'requested')
       RETURNING *`,
      [order_id, myShopId, reason]
    );
    const newReturn = returnRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO return_items (return_id, order_item_id, product_id, quantity, reason, condition)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newReturn.id, item.order_item_id || null, item.product_id, item.quantity, item.reason || reason, item.condition || 'damaged']
      );
    }

    await client.query('COMMIT');

    await logAuditAction({
      userId: user.id,
      action: 'RETURN_REQUESTED',
      entityType: 'return',
      entityId: newReturn.id,
      newData: { order_id, reason, items_count: items.length },
      ipAddress: req.ip,
    });

    return sendCreated(res, { data: { return: newReturn }, message: 'Return request submitted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/returns/:id/status
 * Admin processes return (approves, rejects, refunds).
 */
export const updateReturnStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, refund_amount = 0, refund_method, notes } = req.body;
    const user = req.user;

    const valid = ['requested', 'approved', 'rejected', 'picked_up', 'received', 'refunded', 'replaced', 'closed'];
    if (!valid.includes(status)) {
      return sendError(res, { message: `Invalid status. Allowed: ${valid.join(', ')}`, statusCode: 400 });
    }

    await client.query('BEGIN');

    const retRes = await client.query('SELECT * FROM returns WHERE id = $1 FOR UPDATE', [id]);
    if (retRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Return not found', statusCode: 404 });
    }
    const currentRet = retRes.rows[0];

    const result = await client.query(
      `UPDATE returns SET
        status = $1,
        refund_amount = COALESCE($2, refund_amount),
        refund_method = COALESCE($3, refund_method),
        processed_by = $4,
        notes = COALESCE($5, notes),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *`,
      [status, parseFloat(refund_amount) || null, refund_method || null, user.id, notes || null, id]
    );

    // If refunded or approved with refund amount, credit back to shop ledger
    if (status === 'refunded' && parseFloat(refund_amount) > 0) {
      await client.query(
        `INSERT INTO shop_ledger (
          shop_id, transaction_type, reference_type, reference_id,
          debit, credit, balance, note, created_by
        ) VALUES ($1, 'CREDIT_NOTE', 'return', $2, 0, $3, 0, $4, $5)`,
        [
          currentRet.shop_id, id, parseFloat(refund_amount),
          `Return Refund / Credit Note #${id.slice(0, 8)}`, user.id
        ]
      );

      // Decrement credit_used
      await client.query(
        'UPDATE shops SET credit_used = GREATEST(0, credit_used - $1), updated_at = NOW() WHERE id = $2',
        [parseFloat(refund_amount), currentRet.shop_id]
      );
    }

    await client.query('COMMIT');

    await logAuditAction({
      userId: user.id,
      action: 'RETURN_STATUS_UPDATED',
      entityType: 'return',
      entityId: id,
      oldData: { status: currentRet.status },
      newData: { status, refund_amount },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { return: result.rows[0] }, message: `Return status updated to ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export default {
  listReturns,
  getReturnById,
  createReturn,
  updateReturnStatus,
};
