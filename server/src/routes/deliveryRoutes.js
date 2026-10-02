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
router.post('/assign', authorize('admin'), deliveryController.assignDelivery);
router.patch('/:id/status', authorize('admin'), deliveryController.updateDeliveryStatus);

export default router;
