import {
  findOrCreateAttendance,
  findAttendanceByEmployeeAndDate,
  findAttendanceById,
  findAllAttendance,
  pushCheckInSession,
  closeLatestSession,
} from '../repositories/attendance.repository.js';
import { pauseWorklogsForEmployee, resumeWorklogsForEmployee } from '../repositories/worklog.repository.js';
import { findEmployeeByUserId } from '../repositories/employee.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { IAttendance } from '../types/business.js';
import type { JwtPayload } from '../types/index.js';

/** Roles that can manage any employee's attendance */
async function hasAttendanceManagementAccess(user: JwtPayload): Promise<boolean> {
  return [
    SYSTEM_ROLES.SUPER_ADMIN,
    SYSTEM_ROLES.ADMIN,
    SYSTEM_ROLES.HR,
    SYSTEM_ROLES.PROJECT_MANAGER,
  ].includes(user.roleName as never);
}

async function resolveEmployeeForCaller(user: JwtPayload): Promise<string> {
  const employee = await findEmployeeByUserId(user.userId);
  if (!employee) throw new AppError('No employee profile linked to your account', 404);
  return employee._id.toString();
}

/** Returns a Date set to midnight (start of day) in UTC for the given date (or today) */
function toDateOnly(d?: Date): Date {
  const base = d ? new Date(d) : new Date();
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------
export async function checkIn(user: JwtPayload): Promise<IAttendance> {
  const employeeId = await resolveEmployeeForCaller(user);
  const today = toDateOnly();

  const attendance = await findOrCreateAttendance(employeeId, today);

  if (attendance.is_checked_in) {
    throw new AppError('You are already checked in. Please check out first.', 409);
  }

  const checkInTime = new Date();
  await resumeWorklogsForEmployee(employeeId, checkInTime);
  const updated = await pushCheckInSession(attendance._id, checkInTime);
  if (!updated) throw new AppError('Failed to record check-in', 500);
  return updated;
}

// ---------------------------------------------------------------------------
// Check-out
// ---------------------------------------------------------------------------
export async function checkOut(user: JwtPayload): Promise<IAttendance> {
  const employeeId = await resolveEmployeeForCaller(user);
  const today = toDateOnly();

  const attendance = await findAttendanceByEmployeeAndDate(employeeId, today);
  if (!attendance) throw new AppError('No attendance record found for today', 404);
  if (!attendance.is_checked_in) throw new AppError('You are not currently checked in', 409);

  // Find the open session (the one without a check_out)
  const openSession = attendance.sessions.find((s) => !s.check_out);
  if (!openSession) throw new AppError('No open session found', 409);

  const checkOutTime = new Date();
  const durationMinutes = Math.round(
    (checkOutTime.getTime() - new Date(openSession.check_in).getTime()) / 60000
  );

  await pauseWorklogsForEmployee(employeeId, checkOutTime);
  const updated = await closeLatestSession(attendance._id, checkOutTime, durationMinutes);
  if (!updated) throw new AppError('Failed to record check-out', 500);
  return updated;
}

// ---------------------------------------------------------------------------
// Today's summary for the calling user
// ---------------------------------------------------------------------------
export async function getTodayAttendance(user: JwtPayload): Promise<IAttendance | null> {
  const employeeId = await resolveEmployeeForCaller(user);
  const today = toDateOnly();
  return findAttendanceByEmployeeAndDate(employeeId, today);
}

// ---------------------------------------------------------------------------
// List (scoped by role)
// ---------------------------------------------------------------------------
export async function listAttendance(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: {
    employee_id?: string;
    date_from?: Date;
    date_to?: Date;
  }
): Promise<{ data: IAttendance[]; total: number; page: number; limit: number; totalPages: number }> {
  const isManager = await hasAttendanceManagementAccess(user);

  let scope: Record<string, unknown> = {};
  if (!isManager) {
    const employee = await findEmployeeByUserId(user.userId);
    scope = employee ? { employee_id: employee._id } : { employee_id: '000000000000000000000000' };

    if (filters.employee_id && employee && filters.employee_id !== employee._id.toString()) {
      throw new AppError('Cannot view other employees attendance', 403);
    }
  }

  return findAllAttendance(page, limit, {
    ...omitUndefined({
      employee_id: isManager ? filters.employee_id : undefined,
      date_from: filters.date_from,
      date_to: filters.date_to,
    }) as Omit<import('../repositories/attendance.repository.js').AttendanceListFilters, 'scope'>,
    scope,
  });
}

// ---------------------------------------------------------------------------
// Get single record
// ---------------------------------------------------------------------------
export async function getAttendanceById(id: string, user: JwtPayload): Promise<IAttendance> {
  const record = await findAttendanceById(id);
  if (!record) throw new AppError('Attendance record not found', 404);

  const isManager = await hasAttendanceManagementAccess(user);
  if (!isManager) {
    const employee = await findEmployeeByUserId(user.userId);
    if (!employee || record.employee_id.toString() !== employee._id.toString()) {
      throw new AppError('Access denied to this attendance record', 403);
    }
  }
  return record;
}
