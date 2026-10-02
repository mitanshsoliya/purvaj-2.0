import express from 'express';
import billingController from '../controllers/billingController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/billing/invoices
 * @desc    List invoices (shops view own; admin views all)
 */
router.get('/invoices', billingController.listInvoices);

/**
 * @route   GET /api/billing/invoices/:id
 * @desc    Get invoice details with order items
 */
router.get('/invoices/:id', billingController.getInvoiceById);

/**
 * @route   POST /api/billing/invoices
 * @desc    Generate invoice from order
 * @access  Admin, Billing Clerk
 */
router.post('/invoices', authorize('admin'), billingController.createInvoice);
router.patch('/invoices/:id/status', authorize('admin'), billingController.updateInvoiceStatus);

export default router;
