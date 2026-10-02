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
router.post('/invoices', authorize('super_admin', 'admin', 'billing_clerk'), billingController.createInvoice);

/**
 * @route   PATCH /api/billing/invoices/:id/status
 * @desc    Update invoice status
 * @access  Admin, Billing Clerk
 */
router.patch('/invoices/:id/status', authorize('super_admin', 'admin', 'billing_clerk'), billingController.updateInvoiceStatus);

export default router;
