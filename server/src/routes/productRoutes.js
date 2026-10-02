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
router.post('/', authenticate, authorize('super_admin', 'admin', 'warehouse_manager'), productController.createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product details
 * @access  Admin, Warehouse Manager
 */
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'warehouse_manager'), productController.updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Soft-delete product
 * @access  Admin
 */
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), productController.deleteProduct);

/**
 * @route   POST /api/products/:id/shop-price
 * @desc    Set custom shop pricing override
 * @access  Admin
 */
router.post('/:id/shop-price', authenticate, authorize('super_admin', 'admin'), productController.setShopPrice);

export default router;
