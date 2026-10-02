import express from 'express';
import broadcastController from '../controllers/broadcastController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/broadcasts/summary
 * @desc    KPI metrics summary for Admin Broadcast Center
 */
router.get('/summary', authorize('admin'), broadcastController.getBroadcastSummary);

/**
 * @route   GET /api/broadcasts
 * @desc    List broadcasts / message history with delivery stats
 */
router.get('/', broadcastController.listBroadcasts);

/**
 * @route   GET /api/broadcasts/:id
 * @desc    Get broadcast details with full recipient status table
 */
router.get('/:id', authorize('admin'), broadcastController.getBroadcastById);

/**
 * @route   POST /api/broadcasts
 * @desc    Compose and send broadcast to all, selected, or grouped shops
 * @access  Admin
 */
router.post('/', authorize('admin'), broadcastController.createBroadcast);

export default router;
