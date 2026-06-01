import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import { sendError } from '../utils/response.js';

type RequestSchema = z.ZodObject<{
  body?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
}>;

export function validate(schema: RequestSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const errors = result.error.issues.map((e: z.core.$ZodIssue) => ({
        field: e.path.slice(1).join('.'),
        message: e.message,
      }));
      sendError(res, 'Validation failed', 422, errors);
      return;
    }

    // Express 5 makes req.query a read-only getter — store coerced values on res.locals instead
    if (result.data.body !== undefined) req.body = result.data.body;
    if (result.data.query !== undefined) res.locals['query'] = result.data.query;

    next();
  };
}
