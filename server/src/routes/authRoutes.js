import express from 'express';
import authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../utils/validate.js';
import {
  loginSchema,
  registerShopSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../validators/authValidators.js';

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin or shop user with email & password
 * @access  Public
 */
router.post('/login', validateBody(loginSchema), authController.login);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new shop (creates owner user + shop with status: pending_approval)
 * @access  Public
 */
router.post('/register', validateBody(registerShopSchema), authController.registerShop);

/**
 * @route   POST /api/auth/refresh
 * @desc    Exchange refresh token for a new access token
 * @access  Public
 */
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshAccessToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile (verified against database)
 * @access  Protected
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change authenticated user's password
 * @access  Protected
 */
router.post('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout acknowledgment
 * @access  Public
 */
router.post('/logout', authController.logout);

export default router;
