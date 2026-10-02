import express from 'express';
import offerController from '../controllers/offerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/offers
 * @desc    List active wholesale offers/schemes
 */
router.get('/', offerController.listOffers);

/**
 * @route   GET /api/offers/:id
 * @desc    Get single offer details with linked products/shops
 */
router.get('/:id', offerController.getOfferById);

/**
 * @route   POST /api/offers
 * @desc    Create new promotional offer
 * @access  Admin
 */
router.post('/', authenticate, authorize('admin'), offerController.createOffer);
router.put('/:id', authenticate, authorize('admin'), offerController.updateOffer);
router.delete('/:id', authenticate, authorize('admin'), offerController.deleteOffer);

export default router;
