import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as leadService from '../services/lead.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getLeads: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await leadService.listLeads(Number(q.page ?? 1), Number(q.limit ?? 20), req.user!, {
    ...(q.stage ? { stage: String(q.stage) } : {}),
    ...(q.status ? { status: String(q.status) } : {}),
    ...(q.assigned_user_id ? { assigned_user_id: String(q.assigned_user_id) } : {}),
    ...(q.source ? { source: String(q.source) } : {}),
    ...(q.search ? { search: String(q.search) } : {}),
  });
  sendSuccess(res, result, 'Leads retrieved');
});

export const getLead: RequestHandler = asyncHandler(async (req, res: Response) => {
  const lead = await leadService.getLeadById(param(req, 'id'), req.user!);
  sendSuccess(res, lead, 'Lead retrieved');
});

export const createLead: RequestHandler = asyncHandler(async (req, res: Response) => {
  const lead = await leadService.createNewLead(req.body, req.user!);
  sendSuccess(res, lead, 'Lead created', 201);
});

export const updateLeadHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const lead = await leadService.updateLead(param(req, 'id'), req.body, req.user!);
  sendSuccess(res, lead, 'Lead updated');
});

export const deleteLead: RequestHandler = asyncHandler(async (req, res: Response) => {
  await leadService.removeLead(param(req, 'id'), req.user!);
  sendSuccess(res, null, 'Lead deleted');
});

export const updateLeadStage: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { stage, note } = req.body as { stage: import('../constants/enums.js').LeadStage; note?: string };
  const lead = await leadService.changeLeadStage(param(req, 'id'), stage, req.user!, note);
  sendSuccess(res, lead, 'Lead stage updated');
});

export const assignLeadHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { assigned_user_id } = req.body as { assigned_user_id: string };
  const lead = await leadService.assignLead(param(req, 'id'), assigned_user_id, req.user!);
  sendSuccess(res, lead, 'Lead assigned');
});

export const convertLead: RequestHandler = asyncHandler(async (req, res: Response) => {
  const result = await leadService.convertLeadToClient(param(req, 'id'), req.user!);
  sendSuccess(res, result, 'Lead converted to client');
});

export const addLeadNote: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { note } = req.body as { note: string };
  const lead = await leadService.addLeadNote(param(req, 'id'), note, req.user!);
  sendSuccess(res, lead, 'Note added');
});
