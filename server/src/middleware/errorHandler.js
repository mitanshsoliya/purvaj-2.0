/**
 * PURVAJ 2.0 — Centralized Error Handling Middleware
 * Catches all errors, formats consistent JSON responses.
 * SECURITY: Never exposes stack traces or internal details in production.
 */
import crypto from 'crypto';
import { AppError } from '../utils/AppError.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Generate a unique error reference for support tracking
  const errorRef = crypto.randomUUID().slice(0, 8).toUpperCase();

  // Log full error details server-side (always)
  if (!IS_PRODUCTION) {
    console.error(`[Purvaj Error ${errorRef}]:`, err);
  } else {
    // In production, log all errors with reference and context
    const logEntry = {
      ref: errorRef,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || 'anonymous',
      error: err.message,
      stack: err.isOperational ? undefined : err.stack,
    };
    if (!err.isOperational) {
      console.error('[Purvaj CRITICAL Error]:', JSON.stringify(logEntry));
    } else {
      console.warn('[Purvaj Operational Error]:', JSON.stringify(logEntry));
    }
  }

  // Handle known operational errors
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ref: errorRef,
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
      ref: errorRef,
    });
  }

  // Handle Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist',
      code: 'FK_VIOLATION',
      ref: errorRef,
    });
  }

  // Handle Postgres check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: IS_PRODUCTION
        ? 'Value violates a database constraint'
        : 'Value violates constraint: ' + (err.constraint || 'unknown'),
      code: 'CHECK_VIOLATION',
      ref: errorRef,
    });
  }

  // Handle Postgres invalid input syntax (e.g. invalid UUID format)
  if (err.code === '22P02') {
    return res.status(400).json({
      success: false,
      message: 'Invalid input syntax or identifier format',
      code: 'INVALID_INPUT_SYNTAX',
      ref: errorRef,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      ref: errorRef,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      ref: errorRef,
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      ref: errorRef,
    });
  }

  // Handle payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large',
      code: 'PAYLOAD_TOO_LARGE',
      ref: errorRef,
    });
  }

  // Default: internal server error — NEVER leak stack or internal error message in production
  return res.status(500).json({
    success: false,
    message: IS_PRODUCTION
      ? `An unexpected error occurred. Reference: ${errorRef}`
      : err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    ref: errorRef,
  });
};

export const notFoundHandler = (req, res) => {
  const ref = crypto.randomUUID().slice(0, 8).toUpperCase();
  res.status(404).json({
    success: false,
    message: IS_PRODUCTION
      ? 'Route not found'
      : `Route ${req.method} ${req.originalUrl} not found on Purvaj 2.0 API`,
    code: 'NOT_FOUND',
    ref,
  });
};

export default { errorHandler, notFoundHandler };
