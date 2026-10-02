import pool from '../config/db.js';
import { sendSuccess } from '../utils/response.js';

/**
 * GET /api/reports/sales
 * Daily or monthly sales summary.
 */
export const getSalesReport = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT 
        DATE(created_at) as sale_date,
        COUNT(id)::int as total_orders,
        COALESCE(SUM(total), 0)::numeric as total_revenue,
        COALESCE(SUM(subtotal), 0)::numeric as total_subtotal,
        COALESCE(SUM(tax), 0)::numeric as total_tax
       FROM orders
       WHERE created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL
         AND order_status NOT IN ('cancelled')
       GROUP BY DATE(created_at)
       ORDER BY sale_date DESC`,
      [parseInt(days)]
    );

    return sendSuccess(res, { data: { sales: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/top-products
 * Best performing wholesale products by units ordered & revenue.
 */
export const getTopProductsReport = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT 
        oi.product_id,
        oi.sku,
        oi.product_name_snapshot as product_name,
        SUM(oi.quantity)::int as total_quantity_sold,
        SUM(oi.total)::numeric as total_revenue,
        COUNT(DISTINCT oi.order_id)::int as order_appearances
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.order_status NOT IN ('cancelled')
       GROUP BY oi.product_id, oi.sku, oi.product_name_snapshot
       ORDER BY total_quantity_sold DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    return sendSuccess(res, { data: { topProducts: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/shop-performance
 * Shop metrics: order counts, total purchased, credit balance.
 */
export const getShopPerformanceReport = async (req, res, next) => {
  try {
    const { limit = 15 } = req.query;

    const result = await pool.query(
      `SELECT 
        s.id,
        s.shop_name,
        s.city,
        s.credit_limit,
        s.credit_used,
        s.status,
        COUNT(o.id)::int as total_orders,
        COALESCE(SUM(o.total), 0)::numeric as lifetime_spend
       FROM shops s
       LEFT JOIN orders o ON s.id = o.shop_id AND o.order_status NOT IN ('cancelled')
       GROUP BY s.id
       ORDER BY lifetime_spend DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    return sendSuccess(res, { data: { shopPerformance: result.rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/inventory-valuation
 * Current central warehouse inventory valuation.
 */
export const getInventoryValuationReport = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(p.id)::int as total_products,
        SUM(inv.current_stock)::int as total_units_in_stock,
        SUM(inv.reserved_stock)::int as total_reserved_units,
        COALESCE(SUM(inv.current_stock * p.selling_price), 0)::numeric as total_selling_value,
        COALESCE(SUM(inv.current_stock * p.purchase_price), 0)::numeric as total_purchase_value
       FROM inventory inv
       JOIN products p ON inv.product_id = p.id
       WHERE p.status = 'active'`
    );

    return sendSuccess(res, { data: { valuation: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

export default {
  getSalesReport,
  getTopProductsReport,
  getShopPerformanceReport,
  getInventoryValuationReport,
};
