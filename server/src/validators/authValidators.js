import { z } from 'zod';

/**
 * PURVAJ 2.0 — Authentication Validation Schemas (Zod)
 */

export const loginSchema = z.object({
  email: z.string().email('Valid email is required').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

export const registerShopSchema = z.object({
  // Owner info
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  email: z.string().email('Valid email is required').max(255),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Valid 10-digit Indian mobile required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),

  // Shop info
  shop_name: z.string().min(2, 'Shop name required').max(200),
  owner_name: z.string().min(2, 'Owner name required').max(150),
  address: z.string().min(5, 'Address required').max(500).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit pincode required').optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Valid GSTIN format required').optional().or(z.literal('')),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

export default {
  loginSchema,
  registerShopSchema,
  refreshTokenSchema,
  changePasswordSchema,
};
