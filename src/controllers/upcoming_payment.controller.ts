import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as upcomingPaymentService from '../services/upcoming_payment.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getUpcomingPayments: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | undefined>;
  const result = await upcomingPaymentService.listUpcomingPayments(
    Number(q.page ?? 1),
    Number(q.limit ?? 20),
    {
      ...(q.client_id ? { client_id: q.client_id } : {}),
      ...(q.project_id ? { project_id: q.project_id } : {}),
      ...(q.payment_status ? { payment_status: q.payment_status } : {}),
      ...(q.payment_type ? { payment_type: q.payment_type } : {}),
      ...(q.assigned_follow_up_user ? { assigned_follow_up_user: q.assigned_follow_up_user } : {}),
      ...(q.due_within_days ? { due_within_days: Number(q.due_within_days) } : {}),
    }
  );
  sendSuccess(res, result, 'Upcoming payments retrieved');
});

export const getUpcomingPayment: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await upcomingPaymentService.getUpcomingPaymentById(param(req, 'id'));
  sendSuccess(res, record, 'Upcoming payment retrieved');
});

export const createUpcomingPaymentHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    const record = await upcomingPaymentService.createUpcomingPaymentEntry(req.body, req.user!);
    sendSuccess(res, record, 'Upcoming payment created', 201);
  }
);

export const updateUpcomingPaymentHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    const record = await upcomingPaymentService.updateUpcomingPaymentEntry(
      param(req, 'id'),
      req.body
    );
    sendSuccess(res, record, 'Upcoming payment updated');
  }
);

export const markReceivedHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await upcomingPaymentService.markUpcomingPaymentReceived(
    param(req, 'id'),
    req.body.notes
  );
  sendSuccess(res, record, 'Payment marked as received');
});

export const cancelPaymentHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await upcomingPaymentService.cancelUpcomingPayment(
    param(req, 'id'),
    req.body.notes
  );
  sendSuccess(res, record, 'Payment cancelled');
});

export const deleteUpcomingPaymentHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    await upcomingPaymentService.removeUpcomingPayment(param(req, 'id'));
    sendSuccess(res, null, 'Upcoming payment deleted');
  }
);
