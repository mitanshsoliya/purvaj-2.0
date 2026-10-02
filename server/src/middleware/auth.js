import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (JWT_SECRET ? JWT_SECRET + '_refresh' : undefined);

if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Server cannot start securely.');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Generate short-lived access token (15 min)
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

/**
 * Generate long-lived refresh token (7 days)
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

/**
 * authenticate — Express middleware
 * Verifies JWT from Authorization header, attaches user to req.user.
 * Never trusts user_id, role, shop_id from the request body — always derives from JWT + DB.
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      throw AppError.unauthorized('Access token required');
    }
    let decoded;

    // Dev-only demo tokens — BLOCKED in production
    if (IS_DEV && (token === 'demo_jwt_token_purvaj_2.0' || token.startsWith('demo_') || token.startsWith('jwt_admin_'))) {
      decoded = { userId: 'a0000001-0000-0000-0000-000000000001', role: 'admin' };
    } else if (IS_DEV && token.startsWith('jwt_shop_')) {
      decoded = { userId: 'b0000001-0000-0000-0000-000000000001', role: 'shop_owner' };
    } else {
      try {
        decoded = verifyAccessToken(token);
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          throw AppError.unauthorized('Access token expired. Please refresh.', 'TOKEN_EXPIRED');
        }
        throw AppError.unauthorized('Invalid access token');
      }
    }

    // Always fetch fresh user data from DB — never trust JWT payload alone for sensitive fields
    const targetUserId = decoded.userId || decoded.id;
    const userResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role, u.is_active, u.avatar_url
       FROM users u WHERE u.id = $1`,
      [targetUserId]
    );

    if (userResult.rows.length === 0) {
      throw AppError.unauthorized('User account not found');
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      throw AppError.forbidden('Account is deactivated. Contact admin.');
    }

    // If user is a shop_owner, also attach their shop info
    if (user.role === 'shop_owner' || user.role === 'shop_staff') {
      const shopResult = await pool.query(
        `SELECT s.id as shop_id, s.shop_name, s.status, s.credit_limit, s.credit_used
         FROM shops s WHERE s.owner_user_id = $1 AND s.status != 'inactive'
         LIMIT 1`,
        [user.id]
      );
      if (shopResult.rows.length > 0) {
        user.shop = shopResult.rows[0];
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * authorize — Express middleware factory
 * Restricts route access to specific roles.
 * @param  {...string} allowedRoles - e.g. 'admin', 'super_admin', 'shop_owner'
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    // In Purvaj 2.0, Admin has universal access to all admin operations
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    if (isAdmin || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'FORBIDDEN',
    });
  };
};

/**
 * requireActiveShop — Middleware to ensure the shop_owner's shop is approved (active)
 */
export const requireActiveShop = (req, res, next) => {
  if (req.user.role === 'shop_owner' || req.user.role === 'shop_staff') {
    if (!req.user.shop) {
      return res.status(403).json({
        success: false,
        message: 'No shop associated with this account',
        code: 'NO_SHOP',
      });
    }
    if (req.user.shop.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Shop is ${req.user.shop.status}. Cannot perform this action.`,
        code: 'SHOP_NOT_ACTIVE',
      });
    }
  }
  next();
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  authenticate,
  authorize,
  requireActiveShop,
};
