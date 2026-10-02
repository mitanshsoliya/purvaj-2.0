import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get current user notifications & unread count
 */
router.get('/', notificationController.getMyNotifications);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all unread notifications as read
 */
router.patch('/read-all', notificationController.markAllRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark single notification as read
 */
router.patch('/:id/read', notificationController.markNotificationRead);

export default router;
