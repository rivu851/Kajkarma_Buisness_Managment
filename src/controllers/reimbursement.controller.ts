import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as reimbursementService from '../services/reimbursement.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getReimbursements: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | undefined>;
  const result = await reimbursementService.listReimbursements(
    Number(q.page ?? 1),
    Number(q.limit ?? 20),
    {
      ...(q.employee_id ? { employee_id: q.employee_id } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.project_id ? { project_id: q.project_id } : {}),
      ...(q.client_id ? { client_id: q.client_id } : {}),
    },
    req.user!
  );
  sendSuccess(res, result, 'Reimbursements retrieved');
});

export const getReimbursement: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await reimbursementService.getReimbursementById(param(req, 'id'));
  sendSuccess(res, record, 'Reimbursement retrieved');
});

export const submitReimbursementHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    const record = await reimbursementService.submitReimbursement(req.body);
    sendSuccess(res, record, 'Reimbursement submitted', 201);
  }
);

export const updateReimbursementHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    const record = await reimbursementService.updateReimbursement(param(req, 'id'), req.body);
    sendSuccess(res, record, 'Reimbursement updated');
  }
);

export const approveReimbursement: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await reimbursementService.reviewReimbursement(
    param(req, 'id'),
    'approve',
    req.user!,
    req.body.notes
  );
  sendSuccess(res, record, 'Reimbursement approved');
});

export const rejectReimbursement: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await reimbursementService.reviewReimbursement(
    param(req, 'id'),
    'reject',
    req.user!,
    req.body.notes
  );
  sendSuccess(res, record, 'Reimbursement rejected');
});

export const markPaidHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await reimbursementService.markReimbursementPaid(
    param(req, 'id'),
    req.body.paid_date,
    req.body.notes
  );
  sendSuccess(res, record, 'Reimbursement marked as paid');
});

export const deleteReimbursementHandler: RequestHandler = asyncHandler(
  async (req, res: Response) => {
    await reimbursementService.removeReimbursement(param(req, 'id'));
    sendSuccess(res, null, 'Reimbursement deleted');
  }
);
