import express from 'express';
import productController from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Optional authentication middleware for product listing (to allow shop-specific pricing if token is present)
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await authenticate(req, res, () => {});
    } catch (e) {
      // Optional authentication should never fail the request
    }
  }
  next();
};

/**
 * @route   GET /api/products
 * @desc    List products with filters, inventory stock status, and custom shop pricing
 */
router.get('/', optionalAuthenticate, productController.listProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product details
 */
router.get('/:id', optionalAuthenticate, productController.getProductById);

/**
 * @route   POST /api/products
 * @desc    Create new product and initialize inventory
 * @access  Admin, Warehouse Manager
 */
router.post('/', authenticate, authorize('admin'), productController.createProduct);
router.put('/:id', authenticate, authorize('admin'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);
router.post('/:id/shop-price', authenticate, authorize('admin'), productController.setShopPrice);

export default router;
