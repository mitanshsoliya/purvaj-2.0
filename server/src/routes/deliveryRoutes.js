import express from 'express';
import deliveryController from '../controllers/deliveryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/delivery
 * @desc    List delivery orders with filters (pending, today, out for delivery, delivered, cancelled, returns)
 */
router.get('/', deliveryController.listDeliveries);

/**
 * @route   GET /api/delivery/orders/:orderId/timeline
 * @desc    Visual delivery timeline for Shop or Admin
 */
router.get('/orders/:orderId/timeline', deliveryController.getOrderDeliveryTimeline);

/**
 * @route   PATCH /api/delivery/orders/:orderId/status
 * @desc    Update delivery status (ORDERED, CONFIRMED, PROCESSING, PACKED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, returns)
 * @access  Admin / Dispatcher
 */
router.patch('/orders/:orderId/status', authorize('admin'), deliveryController.updateOrderDeliveryStatus);

/**
 * @route   POST /api/delivery/assign
 * @desc    Assign order for delivery
 * @access  Admin, Dispatcher
 */
router.post('/assign', authorize('admin'), deliveryController.assignDelivery);

/**
 * @route   PATCH /api/delivery/:id/status
 * @desc    Backward-compatible status update route
 */
router.patch('/:id/status', authorize('admin'), deliveryController.updateDeliveryStatus);

export default router;
