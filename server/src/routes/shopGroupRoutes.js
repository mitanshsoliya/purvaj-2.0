import express from 'express';
import shopGroupController from '../controllers/shopGroupController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/shop-groups
 * @desc    List all shop groups (accessible to authenticated users/admin)
 */
router.get('/', shopGroupController.listShopGroups);

/**
 * @route   POST /api/shop-groups
 * @desc    Create shop group
 * @access  Admin
 */
router.post('/', authorize('admin'), shopGroupController.createShopGroup);

/**
 * @route   GET /api/shop-groups/:id
 * @desc    Get shop group with members
 */
router.get('/:id', authorize('admin'), shopGroupController.getShopGroupById);

/**
 * @route   POST /api/shop-groups/:id/members
 * @desc    Add shops to group
 * @access  Admin
 */
router.post('/:id/members', authorize('admin'), shopGroupController.addMembersToGroup);

/**
 * @route   DELETE /api/shop-groups/:id/members/:shopId
 * @desc    Remove shop from group
 * @access  Admin
 */
router.delete('/:id/members/:shopId', authorize('admin'), shopGroupController.removeMemberFromGroup);

/**
 * @route   DELETE /api/shop-groups/:id
 * @desc    Delete shop group
 * @access  Admin
 */
router.delete('/:id', authorize('admin'), shopGroupController.deleteShopGroup);

export default router;
