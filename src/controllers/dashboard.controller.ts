import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getDashboardOverview } from '../services/dashboard.service.js';

export const getOverview: RequestHandler = asyncHandler(async (req, res: Response) => {
  const overview = await getDashboardOverview(req.user!);
  sendSuccess(res, overview, 'Dashboard overview retrieved');
});
