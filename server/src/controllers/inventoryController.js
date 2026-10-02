import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * GET /api/inventory
 * List central warehouse stock levels with product details, filters for low stock.
 */
export const listInventory = async (req, res, next) => {
  try {
    const { search, low_stock, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = ["p.status != 'deleted'"];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`);
    }

    if (low_stock === 'true') {
      conditions.push(`(inv.current_stock - inv.reserved_stock) <= inv.minimum_stock`);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM inventory inv JOIN products p ON inv.product_id = p.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        inv.*,
        p.name as product_name,
        p.sku,
        p.barcode,
        p.unit,
        p.pack_size,
        p.selling_price,
        p.mrp,
        c.name as category_name,
        b.name as brand_name,
        CASE 
          WHEN (inv.current_stock - inv.reserved_stock) <= 0 THEN 'out_of_stock'
          WHEN (inv.current_stock - inv.reserved_stock) <= inv.minimum_stock THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status
      FROM inventory inv
      JOIN products p ON inv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ORDER BY 
        CASE WHEN (inv.current_stock - inv.reserved_stock) <= inv.minimum_stock THEN 0 ELSE 1 END,
        inv.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        inventory: result.rows,
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
 * GET /api/inventory/:productId
 * Single product inventory details.
 */
export const getProductInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `SELECT inv.*, p.name as product_name, p.sku, p.minimum_stock as product_min_stock
       FROM inventory inv
       JOIN products p ON inv.product_id = p.id
       WHERE inv.product_id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return sendError(res, { message: 'Inventory record not found', statusCode: 404 });
    }

    return sendSuccess(res, { data: { inventory: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/inventory/adjust
 * Stock movement: STOCK_IN, STOCK_OUT, ADJUSTMENT, DAMAGE.
 * Transactional with inventory locking and audit log.
 */
export const adjustStock = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { product_id, type, quantity, note, reference_type = 'adjustment', reference_id = null } = req.body;

    if (!product_id || !type || quantity === undefined) {
      return sendError(res, { message: 'product_id, type, and quantity are required', statusCode: 400 });
    }

    const validTypes = ['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGE', 'RETURN'];
    if (!validTypes.includes(type)) {
      return sendError(res, { message: `Invalid type. Allowed: ${validTypes.join(', ')}`, statusCode: 400 });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || (type !== 'ADJUSTMENT' && qty <= 0)) {
      return sendError(res, { message: 'Quantity must be a positive integer', statusCode: 400 });
    }

    await client.query('BEGIN');

    // Lock the inventory row
    const invRes = await client.query(
      'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE',
      [product_id]
    );

    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Product inventory record not found', statusCode: 404 });
    }

    const currentInv = invRes.rows[0];
    const prevStock = currentInv.current_stock;
    let newStock = prevStock;

    if (type === 'STOCK_IN' || type === 'RETURN') {
      newStock = prevStock + qty;
    } else if (type === 'STOCK_OUT' || type === 'DAMAGE') {
      if (prevStock < qty) {
        await client.query('ROLLBACK');
        return sendError(res, {
          message: `Insufficient stock. Current stock is ${prevStock}, requested reduction: ${qty}`,
          statusCode: 400,
          code: 'INSUFFICIENT_STOCK'
        });
      }
      newStock = prevStock - qty;
    } else if (type === 'ADJUSTMENT') {
      if (qty < 0) {
        await client.query('ROLLBACK');
        return sendError(res, { message: 'Stock quantity cannot be negative', statusCode: 400 });
      }
      newStock = qty;
    }

    // Update inventory
    const updateRes = await client.query(
      `UPDATE inventory SET
        current_stock = $1,
        last_restocked_at = CASE WHEN $2 IN ('STOCK_IN', 'RETURN') THEN NOW() ELSE last_restocked_at END,
        updated_at = NOW()
       WHERE product_id = $3
       RETURNING *`,
      [newStock, type, product_id]
    );

    // Record stock transaction
    const diffQty = type === 'ADJUSTMENT' ? (newStock - prevStock) : (type === 'STOCK_IN' || type === 'RETURN' ? qty : -qty);
    await client.query(
      `INSERT INTO stock_transactions (
        product_id, type, quantity, reference_type, reference_id,
        previous_stock, new_stock, note, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        product_id, type, diffQty, reference_type, reference_id,
        prevStock, newStock, note || null, req.user?.id || null
      ]
    );

    await client.query('COMMIT');

    // Real-time stock update notification via Socket.IO if available
    if (req.io) {
      req.io.emit('stock_updated', {
        productId: product_id,
        newStock,
        availableStock: newStock - currentInv.reserved_stock,
      });
    }

    await logAuditAction({
      userId: req.user?.id,
      action: `STOCK_${type}`,
      entityType: 'inventory',
      entityId: currentInv.id,
      oldData: { current_stock: prevStock },
      newData: { current_stock: newStock, diff: diffQty },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      data: { inventory: updateRes.rows[0], previousStock: prevStock, newStock },
      message: `Stock updated successfully (${type}: ${diffQty > 0 ? '+' : ''}${diffQty})`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/inventory/transactions
 * View historical stock transaction audit trail.
 */
export const listStockTransactions = async (req, res, next) => {
  try {
    const { product_id, type, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (product_id) {
      params.push(product_id);
      conditions.push(`st.product_id = $${params.length}`);
    }

    if (type) {
      params.push(type);
      conditions.push(`st.type = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM stock_transactions st ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        st.*,
        p.name as product_name,
        p.sku,
        u.name as user_name
      FROM stock_transactions st
      JOIN products p ON st.product_id = p.id
      LEFT JOIN users u ON st.created_by = u.id
      ${whereClause}
      ORDER BY st.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        transactions: result.rows,
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

export default {
  listInventory,
  getProductInventory,
  adjustStock,
  listStockTransactions,
};
