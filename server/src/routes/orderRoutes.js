import express from 'express';
import orderController from '../controllers/orderController.js';
import { authenticate, authorize, requireActiveShop } from '../middleware/auth.js';

const router = express.Router();

// All order endpoints require authentication
router.use(authenticate);

/**
 * @route   POST /api/orders
 * @desc    Place wholesale order (strictly derives prices and shop identity from DB/token)
 * @access  Active Shop Owner or Admin
 */
router.post('/', requireActiveShop, orderController.createOrder);

/**
 * @route   GET /api/orders
 * @desc    List orders (shop owners see only their own; admins see all)
 */
router.get('/', orderController.listOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order details by ID
 */
router.get('/:id', orderController.getOrderById);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Admin / staff updates order lifecycle status (dispatched, delivered, etc.)
 * @access  Admin, Warehouse Manager
 */
router.patch('/:id/status', authorize('admin'), orderController.updateOrderStatus);

/**
 * @route   PATCH /api/orders/:id/cancel
 * @desc    Cancel order (shop can cancel if pending)
 */
router.patch('/:id/cancel', orderController.cancelOrder);

export default router;
