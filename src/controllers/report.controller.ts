import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as reportService from '../services/report.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getReports: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | undefined>;
  const result = await reportService.listReports(Number(q.page ?? 1), Number(q.limit ?? 20), {
    ...(q.client_id ? { client_id: q.client_id } : {}),
    ...(q.project_id ? { project_id: q.project_id } : {}),
    ...(q.report_type ? { report_type: q.report_type } : {}),
    ...(q.month ? { month: q.month } : {}),
  });
  sendSuccess(res, result, 'Reports retrieved');
});

export const getReport: RequestHandler = asyncHandler(async (req, res: Response) => {
  const report = await reportService.getReportById(param(req, 'id'));
  sendSuccess(res, report, 'Report retrieved');
});

export const uploadReportHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const report = await reportService.uploadReport(req.body, req.user!);
  sendSuccess(res, report, 'Report uploaded', 201);
});

export const updateReportHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const report = await reportService.updateReport(param(req, 'id'), req.body);
  sendSuccess(res, report, 'Report updated');
});

export const deleteReportHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  await reportService.removeReport(param(req, 'id'));
  sendSuccess(res, null, 'Report deleted');
});
