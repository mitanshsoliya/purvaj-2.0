import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications + unread count (with category tabs)
 */
router.get('/', notificationController.getMyNotifications);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications read for current user
 */
router.patch('/read-all', notificationController.markAllRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark single notification as read
 */
router.patch('/:id/read', notificationController.markNotificationRead);

/**
 * @route   POST /api/notifications/:id/delivered
 * @desc    Acknowledge notification delivery
 */
router.post('/:id/delivered', notificationController.acknowledgeDelivery);

/**
 * @route   GET /api/notifications/admin/all
 * @desc    Admin lists all system notifications
 */
router.get('/admin/all', authorize('admin'), notificationController.listAllNotificationsAdmin);

export default router;
