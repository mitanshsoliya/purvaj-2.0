import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/payments/webhook
 * @desc    Receive payment gateway webhooks (signature verified, public)
 */
router.post('/webhook', paymentController.handleWebhook);

// Protected routes below
router.use(authenticate);

/**
 * @route   GET /api/payments/overview
 * @desc    Admin overview metrics for payments, collection summary, outstanding
 */
router.get('/overview', authorize('admin'), paymentController.getPaymentOverview);

/**
 * @route   GET /api/payments/transactions
 * @desc    Detailed gateway transaction logs (Shop sees own, Admin sees all)
 */
router.get('/transactions', paymentController.listTransactions);

/**
 * @route   POST /api/payments/intent
 * @desc    Initiate payment order with gateway / safe sandbox
 */
router.post('/intent', paymentController.createPaymentIntent);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment signature / authorization from gateway
 */
router.post('/verify', paymentController.verifyPayment);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Process full/partial refund for an existing payment
 */
router.post('/:id/refund', authorize('admin'), paymentController.refundPayment);

/**
 * @route   POST /api/payments/reminder/:shopId
 * @desc    Trigger WhatsApp/SMS payment reminder for outstanding balance
 */
router.post('/reminder/:shopId', authorize('admin'), paymentController.sendPaymentReminder);

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

