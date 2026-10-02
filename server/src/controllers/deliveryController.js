import pool from '../config/db.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';
import { logAuditAction } from '../utils/audit.js';
import { messagingService } from '../services/messagingService.js';

// Status mapping between Delivery lifecycle and Order status enum
const DELIVERY_TO_ORDER_STATUS = {
  ORDERED: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  PACKED: 'packed',
  OUT_FOR_DELIVERY: 'dispatched',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURN_REQUESTED: 'returned',
  RETURN_APPROVED: 'returned',
  PICKUP: 'returned',
  RETURNED: 'returned',
};

const VALID_DELIVERY_STATUSES = [
  'ORDERED',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURN_APPROVED',
  'PICKUP',
  'RETURNED',
];

/**
 * GET /api/delivery
 * List deliveries / orders with tabs, search, shop filtering, date filtering, and summary counts.
 */
export const listDeliveries = async (req, res, next) => {
  try {
    const user = req.user;
    const {
      status,
      tab = 'all',
      search,
      shop_id,
      start_date,
      end_date,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    // Role check: Shop users only see their own deliveries
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      params.push(myShopId);
      conditions.push(`o.shop_id = $${params.length}`);
    } else if (shop_id && shop_id !== 'all') {
      params.push(shop_id);
      conditions.push(`o.shop_id = $${params.length}`);
    }

    // Filter by tab
    if (tab === 'pending') {
      conditions.push(`COALESCE(o.delivery_status, 'ORDERED') IN ('ORDERED', 'CONFIRMED', 'PROCESSING', 'PACKED')`);
    } else if (tab === 'today') {
      conditions.push(`(
        DATE(o.created_at) = CURRENT_DATE 
        OR DATE(o.estimated_delivery_date) = CURRENT_DATE 
        OR DATE(o.delivered_date) = CURRENT_DATE
      )`);
    } else if (tab === 'out_for_delivery') {
      conditions.push(`COALESCE(o.delivery_status, 'ORDERED') = 'OUT_FOR_DELIVERY'`);
    } else if (tab === 'delivered') {
      conditions.push(`COALESCE(o.delivery_status, 'ORDERED') = 'DELIVERED'`);
    } else if (tab === 'cancelled') {
      conditions.push(`COALESCE(o.delivery_status, 'ORDERED') = 'CANCELLED'`);
    } else if (tab === 'returns') {
      conditions.push(`COALESCE(o.delivery_status, 'ORDERED') IN ('RETURN_REQUESTED', 'RETURN_APPROVED', 'PICKUP', 'RETURNED')`);
    } else if (status && status !== 'all') {
      params.push(status.toUpperCase());
      conditions.push(`UPPER(COALESCE(o.delivery_status, 'ORDERED')) = $${params.length}`);
    }

    // Search query
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(
        o.order_number ILIKE $${pIdx} 
        OR s.shop_name ILIKE $${pIdx} 
        OR s.mobile ILIKE $${pIdx} 
        OR o.contact_person ILIKE $${pIdx} 
        OR o.contact_number ILIKE $${pIdx}
      )`);
    }

    // Date range
    if (start_date) {
      params.push(start_date);
      conditions.push(`o.created_at >= $${params.length}`);
    }
    if (end_date) {
      params.push(end_date);
      conditions.push(`o.created_at <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Summary counts query for admin KPI tabs
    const summaryQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE COALESCE(o.delivery_status, 'ORDERED') IN ('ORDERED', 'CONFIRMED', 'PROCESSING', 'PACKED')) as pending,
        COUNT(*) FILTER (WHERE DATE(o.created_at) = CURRENT_DATE OR DATE(o.estimated_delivery_date) = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE COALESCE(o.delivery_status, 'ORDERED') = 'OUT_FOR_DELIVERY') as out_for_delivery,
        COUNT(*) FILTER (WHERE COALESCE(o.delivery_status, 'ORDERED') = 'DELIVERED') as delivered,
        COUNT(*) FILTER (WHERE COALESCE(o.delivery_status, 'ORDERED') = 'CANCELLED') as cancelled,
        COUNT(*) FILTER (WHERE COALESCE(o.delivery_status, 'ORDERED') IN ('RETURN_REQUESTED', 'RETURN_APPROVED', 'PICKUP', 'RETURNED')) as returns
      FROM orders o
      ${user.role === 'shop_owner' || user.role === 'shop_staff' ? `WHERE o.shop_id = '${user.shop?.shop_id || user.shop?.id}'` : ''}
    `;
    const summaryRes = await pool.query(summaryQuery);
    const summary = summaryRes.rows[0] || {};

    // Total filtered count
    const countQuery = `
      SELECT COUNT(*) 
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Main records query with latest status update notes & driver information
    params.push(parseInt(limit, 10));
    params.push(offset);

    const query = `
      SELECT 
        o.id,
        o.order_number,
        o.shop_id,
        o.subtotal,
        o.discount,
        o.tax,
        o.delivery_charge,
        o.total,
        o.payment_status,
        o.order_status,
        COALESCE(o.delivery_status, 'ORDERED') as delivery_status,
        o.delivery_notes,
        o.contact_person,
        o.contact_number,
        o.estimated_delivery_date,
        o.delivered_date,
        o.created_at,
        o.updated_at,
        s.shop_name,
        s.owner_name,
        s.mobile as shop_mobile,
        s.address as shop_address,
        s.city as shop_city,
        s.pincode as shop_pincode,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
        (
          SELECT json_build_object(
            'from_status', dsh.from_status,
            'to_status', dsh.to_status,
            'note', dsh.note,
            'driver_name', dsh.driver_name,
            'driver_mobile', dsh.driver_mobile,
            'vehicle_number', dsh.vehicle_number,
            'created_at', dsh.created_at
          )
          FROM delivery_status_history dsh 
          WHERE dsh.order_id = o.id 
          ORDER BY dsh.created_at DESC 
          LIMIT 1
        ) as latest_history
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);

    return sendSuccess(res, {
      data: {
        deliveries: result.rows,
        summary: {
          total: parseInt(summary.total || 0, 10),
          pending: parseInt(summary.pending || 0, 10),
          today: parseInt(summary.today || 0, 10),
          out_for_delivery: parseInt(summary.out_for_delivery || 0, 10),
          delivered: parseInt(summary.delivered || 0, 10),
          cancelled: parseInt(summary.cancelled || 0, 10),
          returns: parseInt(summary.returns || 0, 10),
        },
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/delivery/orders/:orderId/status
 * Admin updates delivery status (ORDERED -> CONFIRMED -> PROCESSING -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED etc.)
 */
export const updateOrderDeliveryStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;
    const {
      status,
      note,
      estimated_delivery_date,
      contact_person,
      contact_number,
      driver_name,
      driver_mobile,
      vehicle_number,
    } = req.body;

    const normalizedStatus = (status || '').toUpperCase();
    if (!VALID_DELIVERY_STATUSES.includes(normalizedStatus)) {
      return sendError(res, {
        message: `Invalid delivery status '${status}'. Allowed: ${VALID_DELIVERY_STATUSES.join(', ')}`,
        statusCode: 400,
      });
    }

    await client.query('BEGIN');

    // Fetch order
    const orderRes = await client.query(
      `SELECT o.*, s.owner_user_id, s.shop_name, s.mobile as shop_mobile 
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       WHERE o.id = $1 
       FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, { message: 'Order not found', statusCode: 404 });
    }

    const order = orderRes.rows[0];
    const prevDeliveryStatus = order.delivery_status || 'ORDERED';
    const mappedOrderStatus = DELIVERY_TO_ORDER_STATUS[normalizedStatus] || order.order_status;

    // Determine timestamp updates
    let deliveredDateVal = order.delivered_date;
    if (normalizedStatus === 'DELIVERED' && !deliveredDateVal) {
      deliveredDateVal = new Date();
    }

    // Update orders table
    const updateOrderQuery = `
      UPDATE orders SET
        delivery_status = $1,
        order_status = $2,
        estimated_delivery_date = COALESCE($3, estimated_delivery_date),
        delivered_date = $4,
        delivery_notes = COALESCE($5, delivery_notes),
        contact_person = COALESCE($6, contact_person),
        contact_number = COALESCE($7, contact_number),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const updatedOrderRes = await client.query(updateOrderQuery, [
      normalizedStatus,
      mappedOrderStatus,
      estimated_delivery_date || null,
      deliveredDateVal,
      note || null,
      contact_person || null,
      contact_number || null,
      orderId,
    ]);

    const updatedOrder = updatedOrderRes.rows[0];

    // Insert into delivery_status_history (Audit Trail)
    await client.query(
      `INSERT INTO delivery_status_history (
        order_id, from_status, to_status, note, driver_name, driver_mobile, vehicle_number, changed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        orderId,
        prevDeliveryStatus,
        normalizedStatus,
        note || `Delivery status changed to ${normalizedStatus}`,
        driver_name || null,
        driver_mobile || null,
        vehicle_number || null,
        req.user?.id || null,
      ]
    );

    // Also update order_status_history table for backward compatibility
    try {
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          orderId,
          order.order_status,
          mappedOrderStatus,
          req.user?.id || null,
          note || `Delivery status changed to ${normalizedStatus}`,
        ]
      );
    } catch (e) {
      // Ignore if table structure differs
    }

    // Create In-App Notification for shop owner
    if (order.owner_user_id) {
      await client.query(
        `INSERT INTO notifications (recipient_user_id, title, message, type, priority, action_url)
         VALUES ($1, $2, $3, 'order', 'normal', $4)`,
        [
          order.owner_user_id,
          `Delivery Update: ${normalizedStatus.replace(/_/g, ' ')}`,
          `Your order #${order.order_number} is now ${normalizedStatus.replace(/_/g, ' ')}. ${note ? 'Note: ' + note : ''}`,
          `/shop/orders`,
        ]
      );
    }

    await client.query('COMMIT');

    // Trigger WhatsApp & SMS notification via Messaging Service
    messagingService.notifyDeliveryUpdate({
      shopId: order.shop_id,
      shopName: order.shop_name,
      mobile: order.contact_number || order.shop_mobile,
      orderId: order.id,
      orderNumber: order.order_number,
      deliveryStatus: normalizedStatus,
      estimatedDate: estimated_delivery_date || order.estimated_delivery_date,
      notes: note,
    }).catch(err => console.error('[DeliveryController] Messaging notification error:', err.message));

    // Emit Realtime Socket events
    if (req.io) {
      req.io.emit('delivery_status_changed', {
        orderId,
        orderNumber: order.order_number,
        deliveryStatus: normalizedStatus,
        orderStatus: mappedOrderStatus,
      });
      req.io.to(`shop_${order.shop_id}`).emit('shop_order_updated', {
        orderId,
        orderNumber: order.order_number,
        deliveryStatus: normalizedStatus,
      });
    }

    await logAuditAction({
      userId: req.user?.id,
      action: 'DELIVERY_STATUS_CHANGED',
      entityType: 'delivery',
      entityId: orderId,
      oldData: { delivery_status: prevDeliveryStatus },
      newData: { delivery_status: normalizedStatus, note, driver_name },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      data: { order: updatedOrder },
      message: `Delivery status updated to ${normalizedStatus}`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * GET /api/delivery/orders/:orderId/timeline
 * Get visual delivery timeline for Shop or Admin.
 */
export const getOrderDeliveryTimeline = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const user = req.user;

    const orderRes = await pool.query(
      `SELECT 
        o.id,
        o.order_number,
        o.shop_id,
        o.total,
        o.payment_status,
        o.order_status,
        COALESCE(o.delivery_status, 'ORDERED') as delivery_status,
        o.contact_person,
        o.contact_number,
        o.delivery_notes,
        o.estimated_delivery_date,
        o.delivered_date,
        o.created_at,
        s.shop_name,
        s.address as delivery_address,
        s.city as delivery_city,
        s.pincode as delivery_pincode,
        s.mobile as shop_mobile
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return sendError(res, { message: 'Order not found', statusCode: 404 });
    }

    const order = orderRes.rows[0];

    // Security check: Shop user cannot view another shop's delivery timeline
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const myShopId = user.shop?.shop_id || user.shop?.id;
      if (order.shop_id !== myShopId) {
        return sendError(res, { message: 'Access denied to this order timeline', statusCode: 403 });
      }
    }

    // Fetch delivery status history audit records
    const historyRes = await pool.query(
      `SELECT 
        dsh.id,
        dsh.from_status,
        dsh.to_status,
        dsh.note,
        dsh.driver_name,
        dsh.driver_mobile,
        dsh.vehicle_number,
        dsh.created_at,
        u.name as changed_by_name
       FROM delivery_status_history dsh
       LEFT JOIN users u ON dsh.changed_by = u.id
       WHERE dsh.order_id = $1
       ORDER BY dsh.created_at ASC`,
      [orderId]
    );

    // Standard single-warehouse delivery lifecycle stages
    const standardStages = [
      { key: 'ORDERED', label: 'Order Placed', desc: 'Order received at central warehouse' },
      { key: 'CONFIRMED', label: 'Confirmed', desc: 'Order verified & inventory allocated' },
      { key: 'PROCESSING', label: 'Processing', desc: 'Items retrieved from warehouse racks' },
      { key: 'PACKED', label: 'Packed', desc: 'Securely packaged with invoice & shipping label' },
      { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', desc: 'Dispatched with delivery vehicle' },
      { key: 'DELIVERED', label: 'Delivered', desc: 'Successfully handed over to shop' },
    ];

    const currentStatus = order.delivery_status;
    const historyMap = {};
    historyRes.rows.forEach(h => {
      historyMap[h.to_status] = h;
    });

    const currentStageIndex = standardStages.findIndex(s => s.key === currentStatus);

    const timeline = standardStages.map((stage, idx) => {
      const isPastOrCurrent = currentStageIndex >= 0 && idx <= currentStageIndex;
      const isCurrent = stage.key === currentStatus;
      const historyItem = historyMap[stage.key];

      let timestamp = null;
      if (stage.key === 'ORDERED') {
        timestamp = order.created_at;
      } else if (stage.key === 'DELIVERED' && order.delivered_date) {
        timestamp = order.delivered_date;
      } else if (historyItem) {
        timestamp = historyItem.created_at;
      }

      return {
        key: stage.key,
        title: stage.label,
        description: stage.desc,
        completed: isPastOrCurrent,
        current: isCurrent,
        timestamp,
        notes: historyItem?.note || null,
        driver_name: historyItem?.driver_name || null,
        driver_mobile: historyItem?.driver_mobile || null,
        vehicle_number: historyItem?.vehicle_number || null,
      };
    });

    return sendSuccess(res, {
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          total: order.total,
          payment_status: order.payment_status,
          order_status: order.order_status,
          delivery_status: order.delivery_status,
          contact_person: order.contact_person || order.shop_name,
          contact_number: order.contact_number || order.shop_mobile,
          delivery_address: `${order.delivery_address}, ${order.delivery_city} - ${order.delivery_pincode}`,
          delivery_notes: order.delivery_notes,
          estimated_delivery_date: order.estimated_delivery_date,
          delivered_date: order.delivered_date,
          created_at: order.created_at,
        },
        timeline,
        history: historyRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/delivery/assign
 * Backward compatible assignment endpoint.
 */
export const assignDelivery = async (req, res, next) => {
  try {
    const { order_id, driver_name, driver_mobile, vehicle_number, route_info, notes } = req.body;
    if (!order_id) {
      return sendError(res, { message: 'order_id is required', statusCode: 400 });
    }

    // Call updateOrderDeliveryStatus internally
    req.params = { orderId: order_id };
    req.body = {
      status: 'OUT_FOR_DELIVERY',
      driver_name,
      driver_mobile,
      vehicle_number,
      note: notes || (route_info ? `Route: ${route_info}` : 'Assigned for delivery'),
    };
    return updateOrderDeliveryStatus(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/delivery/:id/status
 * Backward compatible status update endpoint.
 */
export const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    req.params = { orderId: id };
    return updateOrderDeliveryStatus(req, res, next);
  } catch (err) {
    next(err);
  }
};

export default {
  listDeliveries,
  updateOrderDeliveryStatus,
  getOrderDeliveryTimeline,
  assignDelivery,
  updateDeliveryStatus,
};
