import express from 'express';
import adminController from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard metrics (shops, orders, revenue, inventory)
 */
router.get('/stats', adminController.getDashboardStats);

/**
 * @route   GET /api/admin/shops
 * @desc    List all shops with pagination, status filter, search
 */
router.get('/shops', adminController.listShops);

/**
 * @route   POST /api/admin/shops
 * @desc    Admin manually creates a new shop and owner user
 */
router.post('/shops', adminController.createShop);

/**
 * @route   GET /api/admin/shops/:id
 * @desc    Get detailed shop information
 */
router.get('/shops/:id', adminController.getShopDetail);

/**
 * @route   PUT /api/admin/shops/:id
 * @desc    Update shop details (credit limit, payment terms, contact info)
 */
router.put('/shops/:id', adminController.updateShop);

/**
 * @route   PATCH /api/admin/shops/:id/approve
 * @desc    Approve pending shop registration
 */
router.patch('/shops/:id/approve', adminController.approveShop);

/**
 * @route   PATCH /api/admin/shops/:id/block
 * @desc    Block an active shop
 */
router.patch('/shops/:id/block', adminController.blockShop);

/**
 * @route   PATCH /api/admin/shops/:id/reactivate
 * @desc    Reactivate a blocked or suspended shop
 */
router.patch('/shops/:id/reactivate', adminController.reactivateShop);

/**
 * @route   POST /api/admin/shops/:id/reset-password
 * @desc    Admin resets shop owner's login password
 */
router.post('/shops/:id/reset-password', adminController.resetShopPassword);

/**
 * @route   GET /api/admin/brands
 * @desc    List all brands
 */
router.get('/brands', adminController.listBrands);

/**
 * @route   POST /api/admin/brands
 * @desc    Create new brand
 */
router.post('/brands', adminController.createBrand);

export default router;
