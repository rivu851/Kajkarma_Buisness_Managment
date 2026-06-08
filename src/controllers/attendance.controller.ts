import type { Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as attendanceService from '../services/attendance.service.js';

function param(req: import('express').Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const checkIn: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await attendanceService.checkIn(req.user!);
  sendSuccess(res, record, 'Checked in successfully', 201);
});

export const checkOut: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await attendanceService.checkOut(req.user!);
  sendSuccess(res, record, 'Checked out successfully');
});

export const getTodayAttendance: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await attendanceService.getTodayAttendance(req.user!);
  sendSuccess(res, record, "Today's attendance retrieved");
});

export const getAttendanceList: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await attendanceService.listAttendance(
    Number(q.page ?? 1),
    Number(q.limit ?? 20),
    req.user!,
    {
      ...(q.employee_id ? { employee_id: String(q.employee_id) } : {}),
      ...(q.date_from ? { date_from: new Date(String(q.date_from)) } : {}),
      ...(q.date_to ? { date_to: new Date(String(q.date_to)) } : {}),
    }
  );
  sendSuccess(res, result, 'Attendance records retrieved');
});

export const getAttendanceRecord: RequestHandler = asyncHandler(async (req, res: Response) => {
  const record = await attendanceService.getAttendanceById(param(req, 'id'), req.user!);
  sendSuccess(res, record, 'Attendance record retrieved');
});
