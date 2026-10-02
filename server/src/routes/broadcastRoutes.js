import express from 'express';
import broadcastController from '../controllers/broadcastController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/broadcasts
 * @desc    List broadcasts / announcements
 */
router.get('/', broadcastController.listBroadcasts);

/**
 * @route   POST /api/broadcasts
 * @desc    Send announcement broadcast
 * @access  Admin
 */
router.post('/', authorize('super_admin', 'admin'), broadcastController.createBroadcast);

export default router;
