import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as salaryService from '../services/salary.service.js';
import type { SalaryPaymentMode } from '../constants/enums.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getSalaries: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await salaryService.listSalaries(Number(q.page ?? 1), Number(q.limit ?? 20), {
    ...(q.employee_id ? { employee_id: String(q.employee_id) } : {}),
    ...(q.month ? { month: Number(q.month) } : {}),
    ...(q.year ? { year: Number(q.year) } : {}),
    ...(q.status ? { status: String(q.status) } : {}),
  });
  sendSuccess(res, result, 'Salaries retrieved');
});

export const getSalary: RequestHandler = asyncHandler(async (req, res: Response) => {
  const salary = await salaryService.getSalaryById(param(req, 'id'));
  sendSuccess(res, salary, 'Salary retrieved');
});

export const createSalaryHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const salary = await salaryService.createSalaryEntry(req.body);
  sendSuccess(res, salary, 'Salary entry created', 201);
});

export const updateSalaryHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const salary = await salaryService.updateSalaryEntry(param(req, 'id'), req.body);
  sendSuccess(res, salary, 'Salary updated');
});

export const markPaid: RequestHandler = asyncHandler(async (req, res: Response) => {
  const body = req.body as { payment_mode: SalaryPaymentMode; payment_date: Date; notes?: string };
  const payData: { payment_mode: SalaryPaymentMode; payment_date: Date; notes?: string } = {
    payment_mode: body.payment_mode,
    payment_date: body.payment_date,
  };
  if (body.notes) payData.notes = body.notes;
  const salary = await salaryService.markSalaryPaid(param(req, 'id'), payData, req.user!);
  sendSuccess(res, salary, 'Salary marked as paid');
});

export const deleteSalary: RequestHandler = asyncHandler(async (req, res: Response) => {
  await salaryService.removeSalary(param(req, 'id'));
  sendSuccess(res, null, 'Salary entry deleted');
});
