import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as paymentService from '../services/payment.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getPayments: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await paymentService.listPayments(Number(q.page ?? 1), Number(q.limit ?? 20), {
    ...(q.revenue_id ? { revenue_id: String(q.revenue_id) } : {}),
    ...(q.client_id ? { client_id: String(q.client_id) } : {}),
    ...(q.project_id ? { project_id: String(q.project_id) } : {}),
    ...(q.payment_method ? { payment_method: String(q.payment_method) } : {}),
    ...(q.search ? { search: String(q.search) } : {}),
  });
  sendSuccess(res, result, 'Payments retrieved');
});

export const getPayment: RequestHandler = asyncHandler(async (req, res: Response) => {
  const payment = await paymentService.getPaymentById(param(req, 'id'));
  sendSuccess(res, payment, 'Payment retrieved');
});

export const createPayment: RequestHandler = asyncHandler(async (req, res: Response) => {
  const payment = await paymentService.recordPayment(req.body, req.user!);
  sendSuccess(res, payment, 'Payment recorded', 201);
});

export const updatePaymentHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const payment = await paymentService.updatePayment(param(req, 'id'), req.body);
  sendSuccess(res, payment, 'Payment updated');
});

export const deletePayment: RequestHandler = asyncHandler(async (req, res: Response) => {
  await paymentService.removePayment(param(req, 'id'));
  sendSuccess(res, null, 'Payment deleted');
});
