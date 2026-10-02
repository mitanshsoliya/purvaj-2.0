import express from 'express';
import deliveryController from '../controllers/deliveryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/delivery
 * @desc    List delivery tasks
 */
router.get('/', deliveryController.listDeliveries);

/**
 * @route   POST /api/delivery/assign
 * @desc    Assign order for delivery
 * @access  Admin, Dispatcher
 */
router.post('/assign', authorize('super_admin', 'admin', 'dispatcher', 'warehouse_manager'), deliveryController.assignDelivery);

/**
 * @route   PATCH /api/delivery/:id/status
 * @desc    Update delivery milestone status
 * @access  Admin, Dispatcher, Delivery
 */
router.patch('/:id/status', authorize('super_admin', 'admin', 'dispatcher', 'delivery'), deliveryController.updateDeliveryStatus);

export default router;
