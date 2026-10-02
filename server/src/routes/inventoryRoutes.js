import express from 'express';
import inventoryController from '../controllers/inventoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Inventory requires authentication and admin role
router.use(authenticate, authorize('admin'));

/**
 * @route   GET /api/inventory
 * @desc    List warehouse inventory levels with stock status and low-stock filters
 */
router.get('/', inventoryController.listInventory);

/**
 * @route   GET /api/inventory/transactions
 * @desc    View stock transaction history / audit log
 */
router.get('/transactions', inventoryController.listStockTransactions);

/**
 * @route   GET /api/inventory/:productId
 * @desc    Get inventory details for a specific product
 */
router.get('/:productId', inventoryController.getProductInventory);

/**
 * @route   POST /api/inventory/adjust
 * @desc    Adjust inventory (STOCK_IN, STOCK_OUT, ADJUSTMENT, DAMAGE)
 */
router.post('/adjust', authorize('admin'), inventoryController.adjustStock);

export default router;
