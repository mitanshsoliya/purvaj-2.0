import express from 'express';
import reportController from '../controllers/reportController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

/**
 * @route   GET /api/reports/analytics-summary
 * @desc    Top executive KPIs and visual charts summary
 */
router.get('/analytics-summary', reportController.getAdminAnalyticsSummary);

/**
 * @route   GET /api/reports/export
 * @desc    Export report as CSV with date range and filters
 */
router.get('/export', reportController.exportReportCsv);

/**
 * @route   GET /api/reports/sales
 * @desc    Sales Report (gross sales, net sales, orders, AOV, cancellations, returns)
 */
router.get('/sales', reportController.getSalesReport);

/**
 * @route   GET /api/reports/payments
 * @desc    Payment Report (total collected, online, cash, bank/UPI, credit, pending, refunds)
 */
router.get('/payments', reportController.getPaymentReport);

/**
 * @route   GET /api/reports/outstanding
 * @desc    Outstanding Report (total outstanding, shop-wise dues, credit utilization)
 */
router.get('/outstanding', reportController.getOutstandingReport);

/**
 * @route   GET /api/reports/products
 * @desc    Product Report (top-selling, slow-moving, revenue by product, category performance)
 */
router.get('/products', reportController.getProductReport);
router.get('/top-products', reportController.getProductReport); // Backward-compatibility

/**
 * @route   GET /api/reports/inventory
 * @desc    Inventory Report (stock levels, low stock, out of stock, valuation)
 */
router.get('/inventory', reportController.getInventoryReport);
router.get('/inventory-valuation', reportController.getInventoryReport); // Backward-compatibility

/**
 * @route   GET /api/reports/shops
 * @desc    Shop Report (active shops, new shops, orders & revenue per shop)
 */
router.get('/shops', reportController.getShopReport);
router.get('/shop-performance', reportController.getShopReport); // Backward-compatibility

/**
 * @route   GET /api/reports/orders
 * @desc    Order Report (lifecycle status breakdown, pending, confirmed, packed, out for delivery, delivered, cancelled)
 */
router.get('/orders', reportController.getOrderReport);

export default router;
