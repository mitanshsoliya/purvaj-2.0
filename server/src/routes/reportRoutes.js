import express from 'express';
import reportController from '../controllers/reportController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('super_admin', 'admin'));

/**
 * @route   GET /api/reports/sales
 * @desc    Get sales revenue analytics
 */
router.get('/sales', reportController.getSalesReport);

/**
 * @route   GET /api/reports/top-products
 * @desc    Get top selling products
 */
router.get('/top-products', reportController.getTopProductsReport);

/**
 * @route   GET /api/reports/shop-performance
 * @desc    Get shop performance metrics
 */
router.get('/shop-performance', reportController.getShopPerformanceReport);

/**
 * @route   GET /api/reports/inventory-valuation
 * @desc    Get inventory valuation at cost and selling price
 */
router.get('/inventory-valuation', reportController.getInventoryValuationReport);

export default router;
