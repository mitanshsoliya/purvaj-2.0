import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { logAuditAction } from '../utils/audit.js';
import { sendSuccess, sendCreated, sendError } from '../utils/response.js';

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/login
 * Authenticate admin or shop_owner with email + password.
 * Returns access token (short-lived) + refresh token (long-lived).
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validated_body;

    // Fetch user by email — never trust role from frontend
    const result = await pool.query(
      `SELECT id, name, email, mobile, password_hash, role, is_active, avatar_url
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      return sendError(res, {
        message: 'Invalid email or password',
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return sendError(res, {
        message: 'Account is deactivated. Contact administrator.',
        statusCode: 403,
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return sendError(res, {
        message: 'Invalid email or password',
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Build JWT payload — role comes from DB, never frontend
    const tokenPayload = {
      userId: user.id,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last_login_at
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Fetch shop info if shop_owner
    let shopInfo = null;
    if (user.role === 'shop_owner') {
      const shopResult = await pool.query(
        `SELECT id, shop_name, status, credit_limit, credit_used, payment_terms, gstin, city
         FROM shops WHERE owner_user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (shopResult.rows.length > 0) {
        shopInfo = shopResult.rows[0];

        // Check if shop is approved
        if (shopInfo.status === 'pending_approval') {
          return sendError(res, {
            message: 'Your shop registration is pending admin approval.',
            statusCode: 403,
            code: 'SHOP_PENDING_APPROVAL',
          });
        }
        if (shopInfo.status === 'blocked') {
          return sendError(res, {
            message: 'Your shop has been blocked. Contact the wholesaler.',
            statusCode: 403,
            code: 'SHOP_BLOCKED',
          });
        }
      }
    }

    // Build safe user response (never return password_hash)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      avatar_url: user.avatar_url,
    };

    if (shopInfo) {
      userData.shop = shopInfo;
    }

    return sendSuccess(res, {
      data: {
        user: userData,
        accessToken,
        refreshToken,
      },
      message: 'Login successful',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/register
 * Register a new shop (creates user + shop with pending_approval status).
 */
export const registerShop = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const data = req.validated_body;

    await client.query('BEGIN');

    // Check if email already exists
    const existingUser = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [data.email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendError(res, {
        message: 'An account with this email already exists',
        statusCode: 409,
        code: 'EMAIL_EXISTS',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user with role shop_owner
    const userResult = await client.query(
      `INSERT INTO users (name, email, mobile, password_hash, role)
       VALUES ($1, $2, $3, $4, 'shop_owner')
       RETURNING id, name, email, mobile, role`,
      [data.name, data.email, data.mobile, passwordHash]
    );
    const newUser = userResult.rows[0];

    // Create shop with pending_approval
    const shopResult = await client.query(
      `INSERT INTO shops (owner_user_id, shop_name, owner_name, mobile, email, address, city, state, pincode, gstin, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_approval')
       RETURNING id, shop_name, status`,
      [newUser.id, data.shop_name, data.owner_name, data.mobile, data.email,
       data.address || null, data.city || null, data.state || null,
       data.pincode || null, data.gstin || null]
    );
    const newShop = shopResult.rows[0];

    await client.query('COMMIT');

    return sendCreated(res, {
      data: {
        user: newUser,
        shop: newShop,
      },
      message: 'Shop registration submitted. Pending admin approval.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new access token.
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.validated_body;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return sendError(res, {
        message: 'Invalid or expired refresh token. Please log in again.',
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    // Verify user still exists and is active
    const userResult = await pool.query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return sendError(res, {
        message: 'User account is no longer valid',
        statusCode: 401,
        code: 'ACCOUNT_INVALID',
      });
    }

    const user = userResult.rows[0];
    const newAccessToken = generateAccessToken({ userId: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user.id, role: user.role });

    return sendSuccess(res, {
      data: { 
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      message: 'Token refreshed',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's full profile.
 * Identity comes from JWT, never from frontend.
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = req.user; // Set by authenticate middleware from DB

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      avatar_url: user.avatar_url,
    };

    if (user.shop) {
      userData.shop = user.shop;
    }

    return sendSuccess(res, {
      data: { user: userData },
      message: 'Current user retrieved',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/change-password
 * Changes the authenticated user's password.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.validated_body;
    const userId = req.user.id;

    // Get current password hash from DB
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return sendError(res, { message: 'User not found', statusCode: 404, code: 'NOT_FOUND' });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) {
      return sendError(res, { message: 'Current password is incorrect', statusCode: 400, code: 'WRONG_PASSWORD' });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    await logAuditAction({
      userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: userId,
      ipAddress: req.ip,
    });

    return sendSuccess(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Server-side logout acknowledgment.
 * In a stateless JWT system, the client discards the token.
 */
export const logout = (req, res) => {
  return sendSuccess(res, { message: 'Logged out successfully' });
};

export default {
  login,
  registerShop,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  logout,
};
