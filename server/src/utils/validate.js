import { z } from 'zod';
import { AppError } from './AppError.js';

/**
 * PURVAJ 2.0 — Zod Validation Middleware Factory
 * Creates express middleware that validates req.body, req.query, or req.params against Zod schemas.
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const errors = result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(422).json({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors,
        });
      }
      req[`validated_${source}`] = result.data;
      next();
    } catch (err) {
      next(new AppError('Validation processing error', 500));
    }
  };
};

export const validateBody = (schema) => validate(schema, 'body');
export const validateQuery = (schema) => validate(schema, 'query');
export const validateParams = (schema) => validate(schema, 'params');

export default { validate, validateBody, validateQuery, validateParams };
