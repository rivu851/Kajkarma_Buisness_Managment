import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as employeeService from '../services/employee.service.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getEmployees: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await employeeService.listEmployees(Number(q.page ?? 1), Number(q.limit ?? 20), req.user!, {
    ...(q.status ? { status: String(q.status) } : {}),
    ...(q.department ? { department: String(q.department) } : {}),
    ...(q.search ? { search: String(q.search) } : {}),
  });
  sendSuccess(res, result, 'Employees retrieved');
});

export const getEmployee: RequestHandler = asyncHandler(async (req, res: Response) => {
  const employee = await employeeService.getEmployeeById(param(req, 'id'), req.user!);
  sendSuccess(res, employee, 'Employee retrieved');
});

export const createEmployee: RequestHandler = asyncHandler(async (req, res: Response) => {
  const employee = await employeeService.createNewEmployee(req.body, req.user!);
  sendSuccess(res, employee, 'Employee created', 201);
});

export const updateEmployeeHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const employee = await employeeService.updateEmployee(param(req, 'id'), req.body, req.user!);
  sendSuccess(res, employee, 'Employee updated');
});

export const deleteEmployee: RequestHandler = asyncHandler(async (req, res: Response) => {
  await employeeService.removeEmployee(param(req, 'id'));
  sendSuccess(res, null, 'Employee deleted');
});
