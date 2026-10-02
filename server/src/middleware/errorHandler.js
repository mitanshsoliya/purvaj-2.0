/**
 * PURVAJ 2.0 — Centralized Error Handling Middleware
 * Catches all errors, formats consistent JSON responses.
 */
import { AppError } from '../utils/AppError.js';

export const errorHandler = (err, req, res, next) => {
  // Log full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Purvaj Error]:', err);
  } else {
    // In production, log only unexpected errors
    if (!err.isOperational) {
      console.error('[Purvaj CRITICAL Error]:', err);
    }
  }

  // Handle known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Handle Postgres unique constraint violation
  if (err.code === '23505') {
    const detail = err.detail || '';
    let field = 'record';
    const match = detail.match(/Key \((.+?)\)/);
    if (match) field = match[1];
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists`,
      code: 'DUPLICATE_ENTRY',
    });
  }

  // Handle Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist',
      code: 'FK_VIOLATION',
    });
  }

  // Handle Postgres check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Value violates constraint: ' + (err.constraint || 'unknown'),
      code: 'CHECK_VIOLATION',
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Default: internal server error
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found on Purvaj 2.0 API`,
    code: 'NOT_FOUND',
  });
};

export default { errorHandler, notFoundHandler };
