import express from 'express';
import categoryController from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    List all active categories with product counts
 */
router.get('/', categoryController.listCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID or slug
 */
router.get('/:id', categoryController.getCategoryById);

/**
 * @route   POST /api/categories
 * @desc    Admin creates new category
 */
router.post('/', authenticate, authorize('admin'), categoryController.createCategory);
router.put('/:id', authenticate, authorize('admin'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('admin'), categoryController.deleteCategory);

export default router;
