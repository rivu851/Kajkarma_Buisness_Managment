import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as subscriptionService from '../services/subscription.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getSubscriptions: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | undefined>;
  const result = await subscriptionService.listSubscriptions(
    Number(q.page ?? 1),
    Number(q.limit ?? 20),
    {
      ...(q.status ? { status: q.status } : {}),
      ...(q.billing_cycle ? { billing_cycle: q.billing_cycle } : {}),
      ...(q.provider ? { provider: q.provider } : {}),
    }
  );
  sendSuccess(res, result, 'Subscriptions retrieved');
});

export const getSubscription: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await subscriptionService.getSubscriptionById(param(req, 'id'));
  sendSuccess(res, record, 'Subscription retrieved');
});

export const createSubscriptionHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    const record = await subscriptionService.createSubscriptionEntry(req.body, req.user!);
    sendSuccess(res, record, 'Subscription created', 201);
  }
);

export const updateSubscriptionHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    const record = await subscriptionService.updateSubscriptionEntry(param(req, 'id'), req.body);
    sendSuccess(res, record, 'Subscription updated');
  }
);

export const renewSubscriptionHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    const record = await subscriptionService.renewSubscription(param(req, 'id'), req.body);
    sendSuccess(res, record, 'Subscription renewed');
  }
);

export const getExpiringSoonHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const days = Number(req.query['days'] ?? 7);
  const records = await subscriptionService.getExpiringSoon(days);
  sendSuccess(res, records, 'Expiring subscriptions retrieved');
});

export const deleteSubscriptionHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    await subscriptionService.removeSubscription(param(req, 'id'));
    sendSuccess(res, null, 'Subscription deleted');
  }
);
