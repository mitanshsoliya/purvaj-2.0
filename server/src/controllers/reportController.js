import pool from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Helper to compute startDate and endDate based on date_range preset or custom dates.
 */
export const parseDateRange = (dateRange = 'last_30_days', startDateStr, endDateStr) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (dateRange) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last_7_days':
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last_30_days':
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'custom':
      if (startDateStr) startDate = new Date(startDateStr);
      if (endDateStr) {
        endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
};

/**
 * 1. GET /api/reports/sales
 * Sales Report: Gross sales, Net sales, Orders, AOV, Cancelled, Returned
 */
export const getSalesReport = async (req, res, next) => {
  try {
    const { date_range = 'last_30_days', start_date, end_date, shop_id } = req.query;
    const { startDate, endDate } = parseDateRange(date_range, start_date, end_date);

    const params = [startDate, endDate];
    let shopCondition = '';
    if (shop_id && shop_id !== 'all') {
      params.push(shop_id);
      shopCondition = `AND o.shop_id = $${params.length}`;
    }

    // KPI Summary
    const summaryQuery = `
      SELECT 
        COUNT(id)::int as total_orders,
        COALESCE(SUM(CASE WHEN order_status NOT IN ('cancelled') THEN total ELSE 0 END), 0)::numeric as gross_sales,
        COALESCE(SUM(CASE WHEN order_status = 'delivered' THEN total ELSE 0 END), 0)::numeric as net_sales,
        COALESCE(AVG(CASE WHEN order_status NOT IN ('cancelled') THEN total ELSE NULL END), 0)::numeric as average_order_value,
        COUNT(CASE WHEN order_status = 'cancelled' THEN 1 ELSE NULL END)::int as cancelled_orders,
        COALESCE(SUM(CASE WHEN order_status = 'cancelled' THEN total ELSE 0 END), 0)::numeric as cancelled_amount,
        COUNT(CASE WHEN order_status = 'returned' THEN 1 ELSE NULL END)::int as returned_orders,
        COALESCE(SUM(CASE WHEN order_status = 'returned' THEN total ELSE 0 END), 0)::numeric as returned_amount,
        COALESCE(SUM(tax), 0)::numeric as total_tax,
        COALESCE(SUM(discount), 0)::numeric as total_discounts
      FROM orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2 ${shopCondition}
    `;
    const summaryRes = await pool.query(summaryQuery, params);

    // Daily breakdown
    const breakdownQuery = `
      SELECT 
        DATE(o.created_at) as date,
        COUNT(o.id)::int as orders_count,
        COALESCE(SUM(CASE WHEN o.order_status NOT IN ('cancelled') THEN o.total ELSE 0 END), 0)::numeric as revenue,
        COALESCE(SUM(CASE WHEN o.order_status = 'delivered' THEN o.total ELSE 0 END), 0)::numeric as delivered_revenue,
        COUNT(CASE WHEN o.order_status = 'cancelled' THEN 1 ELSE NULL END)::int as cancelled_count
      FROM orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2 ${shopCondition}
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `;
    const breakdownRes = await pool.query(breakdownQuery, params);

    return sendSuccess(res, {
      data: {
        summary: summaryRes.rows[0] || {},
        breakdown: breakdownRes.rows,
        filters: { date_range, startDate, endDate, shop_id },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/reports/payments
 * Payment Report: Total collected, method-wise, credit sales, pending, refunds
 */
export const getPaymentReport = async (req, res, next) => {
  try {
    const { date_range = 'last_30_days', start_date, end_date, shop_id } = req.query;
    const { startDate, endDate } = parseDateRange(date_range, start_date, end_date);

    const params = [startDate, endDate];
    let shopCondition = '';
    if (shop_id && shop_id !== 'all') {
      params.push(shop_id);
      shopCondition = `AND p.shop_id = $${params.length}`;
    }

    const summaryQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN p.status::text IN ('paid', 'SUCCESS') THEN amount ELSE 0 END), 0)::numeric as total_collected,
        COALESCE(SUM(CASE WHEN p.method::text IN ('online_gateway', 'gateway') AND p.status::text IN ('paid', 'SUCCESS') THEN amount ELSE 0 END), 0)::numeric as online_payments,
        COALESCE(SUM(CASE WHEN p.method::text = 'cash' AND p.status::text IN ('paid', 'SUCCESS') THEN amount ELSE 0 END), 0)::numeric as cash_payments,
        COALESCE(SUM(CASE WHEN p.method::text IN ('upi', 'bank_transfer', 'neft', 'rtgs') AND p.status::text IN ('paid', 'SUCCESS') THEN amount ELSE 0 END), 0)::numeric as bank_upi_payments,
        COALESCE(SUM(CASE WHEN p.method::text = 'credit' OR notes ILIKE '%credit%' THEN amount ELSE 0 END), 0)::numeric as credit_payments,
        COALESCE(SUM(CASE WHEN p.status::text IN ('pending', 'INITIATED') THEN amount ELSE 0 END), 0)::numeric as pending_payments,
        COALESCE(SUM(CASE WHEN p.status::text IN ('refunded', 'REFUNDED') THEN amount ELSE 0 END), 0)::numeric as refunded_amount,
        COUNT(id)::int as total_transactions
      FROM payments p
      WHERE p.payment_date >= $1 AND p.payment_date <= $2 ${shopCondition}
    `;
    const summaryRes = await pool.query(summaryQuery, params);

    // Method breakdown
    const methodQuery = `
      SELECT 
        p.method::text as method,
        COUNT(id)::int as count,
        COALESCE(SUM(amount), 0)::numeric as total_amount
      FROM payments p
      WHERE p.payment_date >= $1 AND p.payment_date <= $2 ${shopCondition}
        AND p.status::text IN ('paid', 'SUCCESS')
      GROUP BY p.method::text
      ORDER BY total_amount DESC
    `;
    const methodRes = await pool.query(methodQuery, params);

    // Daily collection trend
    const trendQuery = `
      SELECT 
        DATE(p.payment_date) as date,
        COUNT(id)::int as count,
        COALESCE(SUM(amount), 0)::numeric as collected_amount
      FROM payments p
      WHERE p.payment_date >= $1 AND p.payment_date <= $2 ${shopCondition}
        AND p.status::text IN ('paid', 'SUCCESS')
      GROUP BY DATE(p.payment_date)
      ORDER BY date ASC
    `;
    const trendRes = await pool.query(trendQuery, params);

    return sendSuccess(res, {
      data: {
        summary: summaryRes.rows[0] || {},
        methodBreakdown: methodRes.rows,
        trend: trendRes.rows,
        filters: { date_range, startDate, endDate, shop_id },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/reports/outstanding
 * Outstanding Report: Total outstanding, shop-wise outstanding, credit utilization
 */
export const getOutstandingReport = async (req, res, next) => {
  try {
    const { min_outstanding = 0, sort = 'credit_used_desc' } = req.query;

    const summaryRes = await pool.query(`
      SELECT 
        COUNT(id)::int as total_shops,
        COUNT(CASE WHEN credit_used > 0 THEN 1 ELSE NULL END)::int as shops_with_dues,
        COALESCE(SUM(credit_limit), 0)::numeric as total_credit_limit,
        COALESCE(SUM(credit_used), 0)::numeric as total_outstanding,
        COALESCE(SUM(GREATEST(0, credit_limit - credit_used)), 0)::numeric as available_credit,
        ROUND(COALESCE(SUM(credit_used) / NULLIF(SUM(credit_limit), 0) * 100, 0), 2)::numeric as avg_utilization_pct
      FROM shops
      WHERE status = 'active'
    `);

    let orderClause = 'ORDER BY s.credit_used DESC';
    if (sort === 'credit_limit_desc') orderClause = 'ORDER BY s.credit_limit DESC';
    else if (sort === 'shop_name_asc') orderClause = 'ORDER BY s.shop_name ASC';

    const shopsRes = await pool.query(`
      SELECT 
        s.id,
        s.shop_name,
        s.owner_name,
        s.mobile,
        s.city,
        s.credit_limit,
        s.credit_used as outstanding_balance,
        GREATEST(0, s.credit_limit - s.credit_used) as available_credit,
        ROUND(COALESCE((s.credit_used / NULLIF(s.credit_limit, 0)) * 100, 0), 1) as utilization_pct,
        (
          SELECT p.payment_date 
          FROM payments p 
          WHERE p.shop_id = s.id AND p.status::text IN ('paid', 'SUCCESS') 
          ORDER BY p.payment_date DESC 
          LIMIT 1
        ) as last_payment_date,
        (
          SELECT COUNT(*) 
          FROM orders o 
          WHERE o.shop_id = s.id AND o.payment_status IN ('unpaid', 'partially_paid')
        )::int as unpaid_orders_count
      FROM shops s
      WHERE s.status = 'active' AND s.credit_used >= $1
      ${orderClause}
    `, [parseFloat(min_outstanding)]);

    return sendSuccess(res, {
      data: {
        summary: summaryRes.rows[0] || {},
        shops: shopsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. GET /api/reports/products
 * Product Report: Top selling, slow moving, revenue by product, category performance
 */
export const getProductReport = async (req, res, next) => {
  try {
    const { date_range = 'last_30_days', start_date, end_date, limit = 20 } = req.query;
    const { startDate, endDate } = parseDateRange(date_range, start_date, end_date);

    // Top selling products
    const topRes = await pool.query(`
      SELECT 
        oi.product_id,
        oi.sku,
        oi.product_name_snapshot as product_name,
        c.name as category_name,
        SUM(oi.quantity)::int as total_units_sold,
        SUM(oi.total)::numeric as total_revenue,
        COUNT(DISTINCT oi.order_id)::int as orders_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.created_at >= $1 AND o.created_at <= $2 AND o.order_status NOT IN ('cancelled')
      GROUP BY oi.product_id, oi.sku, oi.product_name_snapshot, c.name
      ORDER BY total_units_sold DESC
      LIMIT $3
    `, [startDate, endDate, parseInt(limit)]);

    // Slow moving / low sales products
    const slowRes = await pool.query(`
      SELECT 
        p.id as product_id,
        p.sku,
        p.name as product_name,
        c.name as category_name,
        inv.current_stock,
        COALESCE(SUM(oi.quantity), 0)::int as units_sold
      FROM products p
      JOIN inventory inv ON p.id = inv.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT oi2.product_id, oi2.quantity 
        FROM order_items oi2 
        JOIN orders o2 ON oi2.order_id = o2.id 
        WHERE o2.created_at >= $1 AND o2.created_at <= $2 AND o2.order_status NOT IN ('cancelled')
      ) oi ON p.id = oi.product_id
      WHERE p.status = 'active'
      GROUP BY p.id, p.sku, p.name, c.name, inv.current_stock
      ORDER BY units_sold ASC, inv.current_stock DESC
      LIMIT $3
    `, [startDate, endDate, parseInt(limit)]);

    // Category performance
    const categoryRes = await pool.query(`
      SELECT 
        c.id,
        c.name as category_name,
        COUNT(DISTINCT p.id)::int as product_count,
        COALESCE(SUM(oi.quantity), 0)::int as units_sold,
        COALESCE(SUM(oi.total), 0)::numeric as category_revenue
      FROM categories c
      JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= $1 AND o.created_at <= $2 AND o.order_status NOT IN ('cancelled')
      GROUP BY c.id, c.name
      ORDER BY category_revenue DESC
    `, [startDate, endDate]);

    return sendSuccess(res, {
      data: {
        topProducts: topRes.rows,
        slowMoving: slowRes.rows,
        categoryPerformance: categoryRes.rows,
        filters: { date_range, startDate, endDate },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. GET /api/reports/inventory
 * Inventory Report: Current stock, low stock, out of stock, stock valuation
 */
export const getInventoryReport = async (req, res, next) => {
  try {
    const summaryRes = await pool.query(`
      SELECT 
        COUNT(p.id)::int as total_active_products,
        COALESCE(SUM(inv.current_stock), 0)::int as total_stock_units,
        COALESCE(SUM(inv.reserved_stock), 0)::int as total_reserved_units,
        COALESCE(SUM(inv.current_stock * p.selling_price), 0)::numeric as total_retail_value,
        COALESCE(SUM(inv.current_stock * p.purchase_price), 0)::numeric as total_cost_value,
        COUNT(CASE WHEN inv.current_stock = 0 THEN 1 ELSE NULL END)::int as out_of_stock_count,
        COUNT(CASE WHEN inv.current_stock > 0 AND inv.current_stock <= inv.minimum_stock THEN 1 ELSE NULL END)::int as low_stock_count
      FROM inventory inv
      JOIN products p ON inv.product_id = p.id
      WHERE p.status = 'active'
    `);

    // Low stock items list
    const lowStockRes = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        c.name as category_name,
        inv.current_stock,
        inv.reserved_stock,
        inv.minimum_stock,
        p.purchase_price,
        p.selling_price
      FROM inventory inv
      JOIN products p ON inv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND inv.current_stock <= inv.minimum_stock
      ORDER BY inv.current_stock ASC
      LIMIT 50
    `);

    return sendSuccess(res, {
      data: {
        summary: summaryRes.rows[0] || {},
        lowStockItems: lowStockRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. GET /api/reports/shops
 * Shop Report: Active shops, new shops, orders per shop, revenue per shop, outstanding
 */
export const getShopReport = async (req, res, next) => {
  try {
    const { date_range = 'last_30_days', start_date, end_date } = req.query;
    const { startDate, endDate } = parseDateRange(date_range, start_date, end_date);

    const summaryRes = await pool.query(`
      SELECT 
        COUNT(id)::int as total_shops,
        COUNT(CASE WHEN status = 'active' THEN 1 ELSE NULL END)::int as active_shops,
        COUNT(CASE WHEN created_at >= $1 AND created_at <= $2 THEN 1 ELSE NULL END)::int as new_shops_in_period
      FROM shops
    `, [startDate, endDate]);

    const shopsRankingRes = await pool.query(`
      SELECT 
        s.id,
        s.shop_name,
        s.owner_name,
        s.mobile,
        s.city,
        s.credit_limit,
        s.credit_used as outstanding,
        COUNT(o.id)::int as period_orders,
        COALESCE(SUM(o.total), 0)::numeric as period_revenue,
        COALESCE((
          SELECT SUM(p.amount) 
          FROM payments p 
          WHERE p.shop_id = s.id AND p.payment_date >= $1 AND p.payment_date <= $2 AND p.status::text IN ('paid', 'SUCCESS')
        ), 0)::numeric as period_paid
      FROM shops s
      LEFT JOIN orders o ON s.id = o.shop_id AND o.created_at >= $1 AND o.created_at <= $2 AND o.order_status NOT IN ('cancelled')
      WHERE s.status = 'active'
      GROUP BY s.id
      ORDER BY period_revenue DESC
      LIMIT 50
    `, [startDate, endDate]);

    return sendSuccess(res, {
      data: {
        summary: summaryRes.rows[0] || {},
        shops: shopsRankingRes.rows,
        filters: { date_range, startDate, endDate },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. GET /api/reports/orders
 * Order Report: Total orders, status breakdown (Pending, Confirmed, Processing, Packed, Out for delivery, Delivered, Cancelled, Returned)
 */
export const getOrderReport = async (req, res, next) => {
  try {
    const { date_range = 'last_30_days', start_date, end_date } = req.query;
    const { startDate, endDate } = parseDateRange(date_range, start_date, end_date);

    const summaryRes = await pool.query(`
      SELECT 
        COUNT(id)::int as total_orders,
        COALESCE(SUM(total), 0)::numeric as total_value,
        COUNT(CASE WHEN order_status = 'pending' THEN 1 ELSE NULL END)::int as pending,
        COUNT(CASE WHEN order_status = 'confirmed' THEN 1 ELSE NULL END)::int as confirmed,
        COUNT(CASE WHEN order_status = 'processing' THEN 1 ELSE NULL END)::int as processing,
        COUNT(CASE WHEN order_status = 'packed' THEN 1 ELSE NULL END)::int as packed,
        COUNT(CASE WHEN order_status = 'dispatched' OR delivery_status = 'OUT_FOR_DELIVERY' THEN 1 ELSE NULL END)::int as out_for_delivery,
        COUNT(CASE WHEN order_status = 'delivered' OR delivery_status = 'DELIVERED' THEN 1 ELSE NULL END)::int as delivered,
        COUNT(CASE WHEN order_status = 'cancelled' OR delivery_status = 'CANCELLED' THEN 1 ELSE NULL END)::int as cancelled,
        COUNT(CASE WHEN order_status = 'returned' OR delivery_status IN ('RETURN_REQUESTED', 'RETURN_APPROVED', 'PICKUP', 'RETURNED') THEN 1 ELSE NULL END)::int as returned
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);

    // Trend by day
    const trendRes = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(id)::int as total_orders,
        COUNT(CASE WHEN order_status = 'delivered' OR delivery_status = 'DELIVERED' THEN 1 ELSE NULL END)::int as delivered_count,
        COUNT(CASE WHEN order_status = 'cancelled' OR delivery_status = 'CANCELLED' THEN 1 ELSE NULL END)::int as cancelled_count,
        COALESCE(SUM(total), 0)::numeric as daily_volume
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [startDate, endDate]);

    return sendSuccess(res, {
      data: {
        summary: summaryRes.rows[0] || {},
        trend: trendRes.rows,
        filters: { date_range, startDate, endDate },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. GET /api/reports/analytics-summary
 * Executive KPIs and Dashboard visual chart datasets
 */
export const getAdminAnalyticsSummary = async (req, res, next) => {
  try {
    // 1. Executive Top KPIs
    const kpiRes = await pool.query(`
      SELECT 
        COALESCE((SELECT SUM(total) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND order_status NOT IN ('cancelled')), 0)::numeric as today_sales,
        COALESCE((SELECT SUM(total) FROM orders WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND order_status NOT IN ('cancelled')), 0)::numeric as monthly_sales,
        (SELECT COUNT(*) FROM orders)::int as total_orders,
        (SELECT COUNT(*) FROM orders WHERE order_status IN ('pending', 'confirmed', 'processing'))::int as pending_orders,
        COALESCE((SELECT SUM(credit_used) FROM shops WHERE status = 'active'), 0)::numeric as total_outstanding,
        (SELECT COUNT(*) FROM shops WHERE status = 'active')::int as total_shops,
        (SELECT COUNT(*) FROM inventory inv JOIN products p ON inv.product_id = p.id WHERE p.status = 'active' AND inv.current_stock <= inv.minimum_stock)::int as low_stock_products,
        (SELECT COUNT(*) FROM orders WHERE order_status = 'delivered' OR delivery_status = 'DELIVERED')::int as delivered_orders
    `);

    // 2. Sales Trend (Last 14 days)
    const salesTrendRes = await pool.query(`
      SELECT 
        TO_CHAR(d.day, 'DD Mon') as label,
        d.day::date as date,
        COALESCE(SUM(o.total), 0)::numeric as sales,
        COUNT(o.id)::int as orders
      FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day'::interval) d(day)
      LEFT JOIN orders o ON DATE(o.created_at) = d.day::date AND o.order_status NOT IN ('cancelled')
      GROUP BY d.day
      ORDER BY d.day ASC
    `);

    // 3. Payment collection by mode (Last 30 days)
    const paymentModesRes = await pool.query(`
      SELECT 
        method::text as method,
        COALESCE(SUM(amount), 0)::numeric as amount
      FROM payments
      WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days' AND status::text IN ('paid', 'SUCCESS')
      GROUP BY method::text
      ORDER BY amount DESC
    `);

    // 4. Order status distribution
    const orderStatusRes = await pool.query(`
      SELECT 
        order_status,
        COUNT(*)::int as count
      FROM orders
      GROUP BY order_status
    `);

    // 5. Top 5 Products
    const topProductsRes = await pool.query(`
      SELECT 
        oi.product_name_snapshot as name,
        SUM(oi.quantity)::int as units,
        SUM(oi.total)::numeric as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status NOT IN ('cancelled') AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY oi.product_name_snapshot
      ORDER BY units DESC
      LIMIT 5
    `);

    return sendSuccess(res, {
      data: {
        kpis: kpiRes.rows[0] || {},
        charts: {
          salesTrend: salesTrendRes.rows,
          paymentModes: paymentModesRes.rows,
          orderStatus: orderStatusRes.rows,
          topProducts: topProductsRes.rows,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 9. GET /api/reports/export
 * Download CSV export respecting filters
 */
export const exportReportCsv = async (req, res, next) => {
  try {
    const { type = 'sales', date_range = 'last_30_days', start_date, end_date } = req.query;
    const { startDate, endDate } = parseDateRange(date_range, start_date, end_date);

    let filename = `purvaj_${type}_report_${new Date().toISOString().slice(0, 10)}.csv`;
    let headers = [];
    let rows = [];

    if (type === 'sales') {
      const result = await pool.query(`
        SELECT 
          o.order_number,
          TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI') as order_date,
          s.shop_name,
          s.city,
          o.subtotal,
          o.tax,
          o.discount,
          o.total,
          o.order_status,
          o.payment_status
        FROM orders o
        JOIN shops s ON o.shop_id = s.id
        WHERE o.created_at >= $1 AND o.created_at <= $2
        ORDER BY o.created_at DESC
      `, [startDate, endDate]);

      headers = ['Order Number', 'Date', 'Shop Name', 'City', 'Subtotal', 'Tax', 'Discount', 'Total (INR)', 'Order Status', 'Payment Status'];
      rows = result.rows.map(r => [
        r.order_number,
        r.order_date,
        `"${(r.shop_name || '').replace(/"/g, '""')}"`,
        r.city,
        r.subtotal,
        r.tax,
        r.discount,
        r.total,
        r.order_status,
        r.payment_status,
      ]);
    } else if (type === 'payments') {
      const result = await pool.query(`
        SELECT 
          p.payment_reference,
          TO_CHAR(p.payment_date, 'YYYY-MM-DD HH24:MI') as payment_date,
          s.shop_name,
          p.amount,
          p.method,
          p.status,
          COALESCE(p.transaction_reference, '') as transaction_ref,
          COALESCE(o.order_number, '') as order_number
        FROM payments p
        JOIN shops s ON p.shop_id = s.id
        LEFT JOIN orders o ON p.order_id = o.id
        WHERE p.payment_date >= $1 AND p.payment_date <= $2
        ORDER BY p.payment_date DESC
      `, [startDate, endDate]);

      headers = ['Payment Ref', 'Date', 'Shop Name', 'Amount (INR)', 'Method', 'Status', 'Gateway / Txn Ref', 'Order Number'];
      rows = result.rows.map(r => [
        r.payment_reference,
        r.payment_date,
        `"${(r.shop_name || '').replace(/"/g, '""')}"`,
        r.amount,
        r.method,
        r.status,
        `"${(r.transaction_ref || '').replace(/"/g, '""')}"`,
        r.order_number,
      ]);
    } else if (type === 'outstanding') {
      const result = await pool.query(`
        SELECT 
          s.shop_name,
          s.owner_name,
          s.mobile,
          s.city,
          s.credit_limit,
          s.credit_used,
          GREATEST(0, s.credit_limit - s.credit_used) as available_credit,
          s.status
        FROM shops s
        WHERE s.status = 'active'
        ORDER BY s.credit_used DESC
      `);

      headers = ['Shop Name', 'Owner Name', 'Mobile', 'City', 'Credit Limit (INR)', 'Outstanding / Udhaar (INR)', 'Available Credit (INR)', 'Status'];
      rows = result.rows.map(r => [
        `"${(r.shop_name || '').replace(/"/g, '""')}"`,
        `"${(r.owner_name || '').replace(/"/g, '""')}"`,
        r.mobile,
        r.city,
        r.credit_limit,
        r.credit_used,
        r.available_credit,
        r.status,
      ]);
    } else {
      // Inventory Export
      const result = await pool.query(`
        SELECT 
          p.sku,
          p.name as product_name,
          c.name as category_name,
          inv.current_stock,
          inv.reserved_stock,
          inv.minimum_stock,
          p.purchase_price,
          p.selling_price,
          (inv.current_stock * p.selling_price) as valuation
        FROM inventory inv
        JOIN products p ON inv.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active'
        ORDER BY inv.current_stock ASC
      `);

      headers = ['SKU', 'Product Name', 'Category', 'Current Stock', 'Reserved', 'Min Stock', 'Purchase Price (INR)', 'Selling Price (INR)', 'Total Stock Valuation (INR)'];
      rows = result.rows.map(r => [
        r.sku,
        `"${(r.product_name || '').replace(/"/g, '""')}"`,
        `"${(r.category_name || '').replace(/"/g, '""')}"`,
        r.current_stock,
        r.reserved_stock,
        r.minimum_stock,
        r.purchase_price,
        r.selling_price,
        r.valuation,
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

export default {
  getSalesReport,
  getPaymentReport,
  getOutstandingReport,
  getProductReport,
  getInventoryReport,
  getShopReport,
  getOrderReport,
  getAdminAnalyticsSummary,
  exportReportCsv,
  parseDateRange,
};
