import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';

/**
 * Helper to generate order number: ORD-YYYYMMDD-XXXX
 */
const generateOrderNumber = () => {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${rand}`;
};

/**
 * POST /api/orders
 * Place wholesale order.
 * CRITICAL SECURITY:
 * Never trust shop_id, user_id, price, or total from frontend.
 * Derive shop_id from authenticated user token.
 * Derive all prices and taxes directly from DB.
 */
export const createOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const user = req.user;
    const { items, notes, shop_id: requestedShopId, payment_method } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, { message: 'Order must contain at least one item', statusCode: 400 });
    }

    // Determine target shop_id
    let targetShopId = null;
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      if (!user.shop || !user.shop.shop_id && !user.shop.id) {
        return sendError(res, { message: 'No shop linked to this account', statusCode: 403 });
      }
      targetShopId = user.shop.shop_id || user.shop.id;
    } else if (['super_admin', 'admin'].includes(user.role)) {
      // Admin placing order for a shop
      if (!requestedShopId) {
        return sendError(res, { message: 'shop_id is required when admin creates an order', statusCode: 400 });
      }
      targetShopId = requestedShopId;
    } else {
      return sendError(res, { message: 'Unauthorized to place orders', statusCode: 403 });
    }

    await client.query('BEGIN');

    // 1. Verify shop status is active
    const shopRes = await client.query('SELECT * FROM shops WHERE id = $1', [targetShopId]);
    if (shopRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Shop not found', statusCode: 404 });
    }

    const shop = shopRes.rows[0];
    if (shop.status !== 'active') {
      await client.query('ROLLBACK');
      return sendError(res, {
        message: `Shop is ${shop.status}. Only active approved shops can place orders.`,
        statusCode: 403,
        code: 'SHOP_NOT_ACTIVE',
      });
    }

    // 2. Fetch and calculate each item from DB
    let subtotal = 0;
    let totalTax = 0;
    const validatedItems = [];

    for (const item of items) {
      const { product_id, quantity } = item;
      const qty = parseInt(quantity);
      if (!product_id || isNaN(qty) || qty <= 0) {
        await client.query('ROLLBACK');
        return sendError(res, { message: 'Invalid product or quantity', statusCode: 400 });
      }

      // Fetch product
      const prodRes = await client.query(
        "SELECT * FROM products WHERE id = $1 AND status = 'active'",
        [product_id]
      );
      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return sendError(res, { message: `Product not found or inactive: ${product_id}`, statusCode: 400 });
      }

      const product = prodRes.rows[0];

      if (qty < product.minimum_order_quantity) {
        await client.query('ROLLBACK');
        return sendError(res, {
          message: `Minimum order quantity for ${product.name} is ${product.minimum_order_quantity}`,
          statusCode: 400,
        });
      }

      // Check stock availability
      const invRes = await client.query(
        'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE',
        [product_id]
      );
      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return sendError(res, { message: `Inventory record missing for ${product.name}`, statusCode: 400 });
      }

      const inv = invRes.rows[0];
      const availableStock = inv.current_stock - inv.reserved_stock;
      if (availableStock < qty) {
        await client.query('ROLLBACK');
        return sendError(res, {
          message: `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${qty}`,
          statusCode: 400,
          code: 'INSUFFICIENT_STOCK',
        });
      }

      // Check custom shop price override
      const priceRes = await client.query(
        `SELECT price FROM shop_product_prices 
         WHERE shop_id = $1 AND product_id = $2 AND status = 'active'
         AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
         LIMIT 1`,
        [targetShopId, product_id]
      );

      const unitPrice = priceRes.rows.length > 0 ? parseFloat(priceRes.rows[0].price) : parseFloat(product.selling_price);
      const taxRate = parseFloat(product.tax_rate) || 0;
      const itemSubtotal = +(unitPrice * qty).toFixed(2);
      const itemTax = +((itemSubtotal * taxRate) / 100).toFixed(2);
      const itemTotal = +(itemSubtotal + itemTax).toFixed(2);

      subtotal += itemSubtotal;
      totalTax += itemTax;

      validatedItems.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        image: product.image,
        hsn_code: product.hsn_code,
        quantity: qty,
        unit_price: unitPrice,
        tax_rate: taxRate,
        tax: itemTax,
        total: itemTotal,
      });

      // Reserve stock in inventory
      await client.query(
        'UPDATE inventory SET reserved_stock = reserved_stock + $1, updated_at = NOW() WHERE product_id = $2',
        [qty, product_id]
      );
    }

    subtotal = +subtotal.toFixed(2);
    totalTax = +totalTax.toFixed(2);
    const orderTotal = +(subtotal + totalTax).toFixed(2);

    // 2.1 Apply Configured Credit / Udhaar Rules
    const creditLimit = parseFloat(shop.credit_limit || 0);
    const currentCreditUsed = parseFloat(shop.credit_used || 0);
    const availableCredit = Math.max(0, +(creditLimit - currentCreditUsed).toFixed(2));

    // If order is placed on credit/udhaar and shop has a credit limit configured
    if (creditLimit > 0 && (payment_method === 'credit' || !payment_method)) {
      if (currentCreditUsed + orderTotal > creditLimit) {
        await client.query('ROLLBACK');
        return sendError(res, {
          message: `Order total (₹${orderTotal.toLocaleString('en-IN')}) exceeds available credit limit (₹${availableCredit.toLocaleString('en-IN')}). Please pay via Bank Transfer / Cash or clear pending udhaar.`,
          statusCode: 400,
          code: 'CREDIT_LIMIT_EXCEEDED',
          data: {
            credit_limit: creditLimit,
            credit_used: currentCreditUsed,
            available_credit: availableCredit,
            order_total: orderTotal,
          },
        });
      }
    }

    const orderNotes = notes || (payment_method ? `Payment Method: ${payment_method.toUpperCase()}` : null);
    const orderNumber = generateOrderNumber();

    // 3. Insert order
    const orderRes = await client.query(
      `INSERT INTO orders (
        order_number, shop_id, subtotal, discount, tax, delivery_charge,
        total, payment_status, order_status, notes, placed_by
      ) VALUES ($1, $2, $3, 0, $4, 0, $5, 'unpaid', 'pending', $6, $7)
      RETURNING *`,
      [orderNumber, targetShopId, subtotal, totalTax, orderTotal, orderNotes, user.id]
    );

    const order = orderRes.rows[0];

    // 4. Insert order items snapshot
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO order_items (
          order_id, product_id, sku, product_name_snapshot,
          product_image_snapshot, hsn_code_snapshot, quantity,
          unit_price, discount, tax_rate_snapshot, tax, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11)`,
        [
          order.id, item.product_id, item.sku, item.name,
          item.image || null, item.hsn_code || null, item.quantity,
          item.unit_price, item.tax_rate, item.tax, item.total
        ]
      );
    }

    // 5. Insert order status history
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
       VALUES ($1, NULL, 'pending', $2, 'Order placed successfully')`,
      [order.id, user.id]
    );

    // 6. Update shop credit_used
    await client.query(
      'UPDATE shops SET credit_used = credit_used + $1, updated_at = NOW() WHERE id = $2',
      [orderTotal, targetShopId]
    );

    // 7. Create notification for shop owner
    const shopOwnerId = shop.owner_user_id;
    await client.query(
      `INSERT INTO notifications (recipient_user_id, title, message, type, priority, action_url)
       VALUES ($1, $2, $3, 'order', 'normal', $4)`,
      [
        shopOwnerId,
        `Order Placed: ${order.order_number}`,
        `Your order #${order.order_number} for ₹${orderTotal.toLocaleString('en-IN')} has been placed successfully.`,
        `/shop/orders`
      ]
    );

    await client.query('COMMIT');

    // Real-time socket alert
    if (req.io) {
      req.io.emit('new_order', {
        orderId: order.id,
        orderNumber: order.order_number,
        shopName: shop.shop_name,
        total: orderTotal,
      });
      req.io.to(`shop_${targetShopId}`).emit('shop_order_created', {
        orderId: order.id,
        orderNumber: order.order_number,
        total: orderTotal,
      });
    }

    await logAuditAction({
      userId: user.id,
      action: 'ORDER_PLACED',
      entityType: 'order',
      entityId: order.id,
      newData: { order_number: order.order_number, total: orderTotal, items_count: validatedItems.length },
      ipAddress: req.ip,
    });

    return sendCreated(res, {
      data: {
        order: {
          ...order,
          items: validatedItems,
        },
      },
      message: `Order ${order.order_number} placed successfully`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/orders
 * List orders. Shop owners see only their own orders. Admin sees all.
 */
export const listOrders = async (req, res, next) => {
  try {
    const user = req.user;
    const { status, payment_status, shop_id, search, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    // Authorization filter: if shop user, strictly force shop_id
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      params.push(myShopId);
      conditions.push(`o.shop_id = $${params.length}`);
    } else if (shop_id) {
      params.push(shop_id);
      conditions.push(`o.shop_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`o.order_status = $${params.length}`);
    }

    if (payment_status && payment_status !== 'all') {
      params.push(payment_status);
      conditions.push(`o.payment_status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(o.order_number ILIKE $${params.length} OR s.shop_name ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders o JOIN shops s ON o.shop_id = s.id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT 
        o.*,
        s.shop_name,
        s.city as shop_city,
        s.mobile as shop_mobile,
        u.name as placed_by_name,
        COUNT(oi.id)::int as item_count
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      LEFT JOIN users u ON o.placed_by = u.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${whereClause}
      GROUP BY o.id, s.shop_name, s.city, s.mobile, u.name
      ORDER BY o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        orders: result.rows,
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
 * GET /api/orders/:id
 * Get single order with items and status timeline.
 */
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const orderRes = await pool.query(
      `SELECT o.*, s.shop_name, s.owner_name, s.mobile as shop_mobile,
              s.address as shop_address, s.city as shop_city, s.gstin as shop_gstin,
              u.name as placed_by_name
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       LEFT JOIN users u ON o.placed_by = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return sendError(res, { message: 'Order not found', statusCode: 404 });
    }

    const order = orderRes.rows[0];

    // Security check: If shop user, ensure it belongs to their shop
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      if (order.shop_id !== myShopId) {
        return sendError(res, { message: 'Access denied to this order', statusCode: 403 });
      }
    }

    // Fetch order items
    const itemsRes = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
      [id]
    );

    // Fetch status history
    const historyRes = await pool.query(
      `SELECT osh.*, u.name as changed_by_name
       FROM order_status_history osh
       LEFT JOIN users u ON osh.changed_by = u.id
       WHERE osh.order_id = $1
       ORDER BY osh.created_at ASC`,
      [id]
    );

    return sendSuccess(res, {
      data: {
        order: {
          ...order,
          items: itemsRes.rows,
          history: historyRes.rows,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/orders/:id/status
 * Admin / Warehouse updates order status.
 * Adjusts inventory reservation/stock and records status history.
 */
export const updateOrderStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const user = req.user;

    const validStatuses = ['pending', 'confirmed', 'processing', 'packed', 'dispatched', 'delivered', 'cancelled', 'returned'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, { message: `Invalid status. Allowed: ${validStatuses.join(', ')}`, statusCode: 400 });
    }

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Order not found', statusCode: 404 });
    }

    const order = orderRes.rows[0];
    const prevStatus = order.order_status;

    if (prevStatus === status) {
      await client.query('ROLLBACK');
      return sendSuccess(res, { data: { order }, message: 'Status is already ' + status });
    }

    // Get order items for stock adjustment
    const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const items = itemsRes.rows;

    // Handle stock changes based on status transitions
    if (status === 'dispatched' && prevStatus !== 'dispatched' && prevStatus !== 'delivered') {
      // Dispatched: release reserved stock and deduct current stock
      for (const item of items) {
        if (item.product_id) {
          const invRes = await client.query('SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE', [item.product_id]);
          if (invRes.rows.length > 0) {
            const currentStock = invRes.rows[0].current_stock;
            const newStock = Math.max(0, currentStock - item.quantity);
            const newReserved = Math.max(0, invRes.rows[0].reserved_stock - item.quantity);

            await client.query(
              'UPDATE inventory SET current_stock = $1, reserved_stock = $2, updated_at = NOW() WHERE product_id = $3',
              [newStock, newReserved, item.product_id]
            );

            await client.query(
              `INSERT INTO stock_transactions (
                product_id, type, quantity, reference_type, reference_id,
                previous_stock, new_stock, note, created_by
              ) VALUES ($1, 'STOCK_OUT', $2, 'order', $3, $4, $5, $6, $7)`,
              [item.product_id, -item.quantity, order.id, currentStock, newStock, `Order dispatched: ${order.order_number}`, user.id]
            );
          }
        }
      }
    } else if (status === 'cancelled' && prevStatus !== 'cancelled') {
      // Cancelled: if dispatched previously, stock is restored; if before dispatched, release reserved stock
      for (const item of items) {
        if (item.product_id) {
          const invRes = await client.query('SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE', [item.product_id]);
          if (invRes.rows.length > 0) {
            if (['dispatched', 'delivered'].includes(prevStatus)) {
              // Return to stock
              const currentStock = invRes.rows[0].current_stock;
              const newStock = currentStock + item.quantity;
              await client.query('UPDATE inventory SET current_stock = $1 WHERE product_id = $2', [newStock, item.product_id]);
            } else {
              // Release reservation
              const newReserved = Math.max(0, invRes.rows[0].reserved_stock - item.quantity);
              await client.query('UPDATE inventory SET reserved_stock = $1 WHERE product_id = $2', [newReserved, item.product_id]);
            }
          }
        }
      }

      // Revert shop credit used
      await client.query(
        'UPDATE shops SET credit_used = GREATEST(0, credit_used - $1) WHERE id = $2',
        [order.total, order.shop_id]
      );
    }

    // Set status timestamps
    let timestampField = '';
    if (status === 'confirmed') timestampField = ', confirmed_at = NOW(), confirmed_by = $3';
    else if (status === 'dispatched') timestampField = ', dispatched_at = NOW()';
    else if (status === 'delivered') timestampField = ', delivered_at = NOW()';
    else if (status === 'cancelled') timestampField = ', cancelled_at = NOW(), cancellation_reason = $4';

    const updateParams = [status, id];
    if (status === 'confirmed') updateParams.push(user.id);
    if (status === 'cancelled') updateParams.push(note || 'Cancelled by admin');

    const updateQuery = `
      UPDATE orders SET 
        order_status = $1, 
        updated_at = NOW() 
        ${timestampField}
      WHERE id = $2
      RETURNING *
    `;

    const updatedOrderRes = await client.query(updateQuery, updateParams);
    const updatedOrder = updatedOrderRes.rows[0];

    // Record status history
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, prevStatus, status, user.id, note || `Status changed from ${prevStatus} to ${status}`]
    );

    // Create notification for shop owner
    const shopRes = await client.query('SELECT owner_user_id, shop_name FROM shops WHERE id = $1', [order.shop_id]);
    if (shopRes.rows.length > 0) {
      await client.query(
        `INSERT INTO notifications (recipient_user_id, title, message, type, priority, action_url)
         VALUES ($1, $2, $3, 'order', 'normal', $4)`,
        [
          shopRes.rows[0].owner_user_id,
          `Order ${order.order_number}: ${status.toUpperCase()}`,
          `Your order #${order.order_number} status has been updated to "${status}".`,
          `/shop/orders`
        ]
      );
    }

    await client.query('COMMIT');

    // Real-time socket event
    if (req.io) {
      req.io.emit('order_status_changed', { orderId: id, orderNumber: order.order_number, newStatus: status });
      req.io.to(`shop_${order.shop_id}`).emit('shop_order_updated', { orderId: id, orderNumber: order.order_number, newStatus: status });
    }

    await logAuditAction({
      userId: user.id,
      action: 'ORDER_STATUS_UPDATED',
      entityType: 'order',
      entityId: id,
      oldData: { status: prevStatus },
      newData: { status },
      ipAddress: req.ip,
    });

    return sendSuccess(res, { data: { order: updatedOrder }, message: `Order status updated to ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/orders/:id/cancel
 * Shop owner cancels their pending order.
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    const myShopId = user.shop?.shop_id || user.shop?.id;
    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (orderRes.rows.length === 0) {
      return sendError(res, { message: 'Order not found', statusCode: 404 });
    }

    const order = orderRes.rows[0];

    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      if (order.shop_id !== myShopId) {
        return sendError(res, { message: 'Access denied', statusCode: 403 });
      }
      if (order.order_status !== 'pending') {
        return sendError(res, {
          message: `Cannot cancel order in "${order.order_status}" status. Contact support.`,
          statusCode: 400
        });
      }
    }

    // Call updateOrderStatus logic with 'cancelled'
    req.body.status = 'cancelled';
    req.body.note = reason || 'Cancelled by shop owner';
    return updateOrderStatus(req, res, next);
  } catch (err) {
    next(err);
  }
};

export default {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};
