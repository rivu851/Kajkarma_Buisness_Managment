import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as worklogService from '../services/worklog.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getWorklogs: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await worklogService.listWorklogs(Number(q.page ?? 1), Number(q.limit ?? 20), req.user!, {
    ...(q.employee_id ? { employee_id: String(q.employee_id) } : {}),
    ...(q.project_id ? { project_id: String(q.project_id) } : {}),
    ...(q.work_status ? { work_status: String(q.work_status) } : {}),
    ...(q.date_from ? { date_from: new Date(String(q.date_from)) } : {}),
    ...(q.date_to ? { date_to: new Date(String(q.date_to)) } : {}),
  });
  sendSuccess(res, result, 'Work logs retrieved');
});

export const getWorklog: RequestHandler = asyncHandler(async (req, res: Response) => {
  const worklog = await worklogService.getWorklogById(param(req, 'id'), req.user!);
  sendSuccess(res, worklog, 'Work log retrieved');
});

export const createWorklog: RequestHandler = asyncHandler(async (req, res: Response) => {
  const worklog = await worklogService.createNewWorklog(req.body, req.user!);
  sendSuccess(res, worklog, 'Work log created', 201);
});

export const updateWorklogHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const worklog = await worklogService.updateWorklog(param(req, 'id'), req.body, req.user!);
  sendSuccess(res, worklog, 'Work log updated');
});

export const deleteWorklog: RequestHandler = asyncHandler(async (req, res: Response) => {
  await worklogService.removeWorklog(param(req, 'id'), req.user!);
  sendSuccess(res, null, 'Work log deleted');
});

export const getGroupedWorklogs: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | undefined>;
  const result = await worklogService.listWorklogsGrouped(req.user!, {
    ...(q.employee_id ? { employee_id: String(q.employee_id) } : {}),
    ...(q.work_status ? { work_status: String(q.work_status) } : {}),
    ...(q.date_from ? { date_from: new Date(String(q.date_from)) } : {}),
    ...(q.date_to ? { date_to: new Date(String(q.date_to)) } : {}),
  });
  sendSuccess(res, { data: result, total_projects: result.length }, 'Work logs grouped by project');
});
