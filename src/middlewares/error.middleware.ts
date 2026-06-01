import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  // Mongoose validation error
  if (isMongooseValidationError(err)) {
    const errors = Object.values(err.errors).map((e: { message: string }) => e.message);
    sendError(res, 'Validation error', 422, errors);
    return;
  }

  // Mongoose duplicate key error
  if (isDuplicateKeyError(err)) {
    sendError(res, 'Duplicate value: resource already exists', 409);
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (isCastError(err)) {
    sendError(res, 'Invalid ID format', 400);
    return;
  }

  logger.error('Unhandled error:', err);

  if (env.isDev()) {
    sendError(res, (err as Error).message ?? 'Internal server error', 500, err);
  } else {
    sendError(res, 'Internal server error', 500);
  }
}

function isMongooseValidationError(err: unknown): err is { name: string; errors: Record<string, { message: string }> } {
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'ValidationError';
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

function isCastError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'CastError';
}
