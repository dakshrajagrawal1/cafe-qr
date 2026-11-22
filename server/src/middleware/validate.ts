// ============================================================
// Zod Request Validation Middleware
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';
import { ValidationError } from '../lib/errors.js';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Middleware factory: validate request body, query, and/or params against Zod schemas.
 * Replaces the original values with parsed (and coerced) values.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {};

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.body = result.error.errors.map(
          (e) => `${e.path.join('.')}: ${e.message}`,
        );
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.query = result.error.errors.map(
          (e) => `${e.path.join('.')}: ${e.message}`,
        );
      } else {
        (req as any).query = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.params = result.error.errors.map(
          (e) => `${e.path.join('.')}: ${e.message}`,
        );
      } else {
        req.params = result.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
}

