import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as revenueService from '../services/revenue.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getRevenues: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await revenueService.listRevenues(Number(q.page ?? 1), Number(q.limit ?? 20), {
    ...(q.client_id ? { client_id: String(q.client_id) } : {}),
    ...(q.project_id ? { project_id: String(q.project_id) } : {}),
    ...(q.status ? { status: String(q.status) } : {}),
    ...(q.type ? { type: String(q.type) } : {}),
    ...(q.search ? { search: String(q.search) } : {}),
  });
  sendSuccess(res, result, 'Revenues retrieved');
});

export const getRevenue: RequestHandler = asyncHandler(async (req, res: Response) => {
  const revenue = await revenueService.getRevenueById(param(req, 'id'));
  sendSuccess(res, revenue, 'Revenue retrieved');
});

export const createRevenueHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const revenue = await revenueService.createNewRevenue(req.body, req.user!);
  sendSuccess(res, revenue, 'Revenue created', 201);
});

export const updateRevenueHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const revenue = await revenueService.updateRevenue(param(req, 'id'), req.body);
  sendSuccess(res, revenue, 'Revenue updated');
});

export const deleteRevenue: RequestHandler = asyncHandler(async (req, res: Response) => {
  await revenueService.removeRevenue(param(req, 'id'));
  sendSuccess(res, null, 'Revenue deleted');
});
