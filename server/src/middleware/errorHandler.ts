// ============================================================
// Global Error Handler Middleware
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../lib/errors.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log the error
  if (env.NODE_ENV === 'development') {
    console.error('[ERROR]', err);
  } else {
    console.error('[ERROR]', err.message);
  }

  // Handle known operational errors
  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      error: {
        code: err.code,
        message: err.message,
      },
    };

    // Include validation errors if present
    if (err instanceof ValidationError && err.errors) {
      response.error = {
        ...response.error as object,
        details: err.errors,
      };
    }

    // Include stack trace in development
    if (env.NODE_ENV === 'development') {
      response.error = {
        ...response.error as object,
        stack: err.stack,
      };
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
          fields: prismaErr.meta?.target,
        },
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
      return;
    }
  }

  // Handle Multer errors
  if (err.constructor.name === 'MulterError') {
    const multerErr = err as any;
    res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: multerErr.code === 'LIMIT_FILE_SIZE'
          ? 'File size too large'
          : multerErr.message,
      },
    });
    return;
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      },
    });
    return;
  }

  // Unknown errors — don't leak details in production
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

