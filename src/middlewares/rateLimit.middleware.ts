import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { env } from '../config/env.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — swap for Redis in production
const store = new Map<string, RateLimitEntry>();

function makeRateLimiter(windowMs: number, max: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;

    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
      return;
    }

    next();
  };
}

export const globalRateLimit = makeRateLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX);

// Stricter limiter for auth routes
export const authRateLimit = makeRateLimiter(15 * 60 * 1000, 10);
