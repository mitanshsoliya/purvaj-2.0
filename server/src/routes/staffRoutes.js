import express from 'express';
import staffController from '../controllers/staffController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('super_admin', 'admin'));

/**
 * @route   GET /api/staff
 * @desc    List all staff members
 */
router.get('/', staffController.listStaff);

/**
 * @route   POST /api/staff
 * @desc    Create new staff user account
 */
router.post('/', staffController.createStaff);

/**
 * @route   PUT /api/staff/:id
 * @desc    Update staff details / role
 */
router.put('/:id', staffController.updateStaff);

export default router;
