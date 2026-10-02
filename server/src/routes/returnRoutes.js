import express from 'express';
import returnController from '../controllers/returnController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/returns
 * @desc    List return requests (shops view own; admin views all)
 */
router.get('/', returnController.listReturns);

/**
 * @route   GET /api/returns/:id
 * @desc    Get return details with items
 */
router.get('/:id', returnController.getReturnById);

/**
 * @route   POST /api/returns
 * @desc    Shop requests return
 */
router.post('/', returnController.createReturn);

/**
 * @route   PATCH /api/returns/:id/status
 * @desc    Admin / warehouse processes return status & credit note
 * @access  Admin, Warehouse Manager
 */
router.patch('/:id/status', authorize('admin'), returnController.updateReturnStatus);

export default router;
