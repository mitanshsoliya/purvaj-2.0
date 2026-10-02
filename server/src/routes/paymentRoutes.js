import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/payments
 * @desc    List payment history (shop owners see own payments; admin sees all)
 */
router.get('/', paymentController.listPayments);

/**
 * @route   GET /api/payments/:id/receipt
 * @desc    Generate printable payment receipt
 */
router.get('/:id/receipt', paymentController.getPaymentReceipt);
router.get('/:id/print', paymentController.getPrintablePaymentReceipt);

/**
 * @route   POST /api/payments
 * @desc    Record wholesale payment (updates shop credit balance and ledger)
 * @access  Admin, Billing Clerk
 */
router.post('/', authorize('admin'), paymentController.recordPayment);

export default router;
