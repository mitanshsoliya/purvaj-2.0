import express from 'express';
import shopController from '../controllers/shopController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/shops/profile
 * @desc    Get currently logged in shop profile & credit standing
 */
router.get('/profile', shopController.getMyShop);

/**
 * @route   PUT /api/shops/profile
 * @desc    Update shop contact/address details (never credit limit or status)
 */
router.put('/profile', shopController.updateMyShop);

/**
 * @route   GET /api/shops/ledger
 * @desc    View shop credit / udhaar ledger statement
 */
router.get('/ledger', shopController.getShopLedger);

export default router;
