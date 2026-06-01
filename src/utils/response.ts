import type { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export function sendSuccess<T>(res: Response, data: T, message = 'Success', statusCode = 200): void {
  const body: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function sendError(res: Response, message: string, statusCode = 400, errors?: unknown): void {
  const body: ApiResponse<never> = { success: false, message, ...(errors ? { errors } : {}) };
  res.status(statusCode).json(body);
}
