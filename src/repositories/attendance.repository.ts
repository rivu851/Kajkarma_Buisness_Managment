import { Attendance } from '../models/attendance.model.js';
import type { IAttendance } from '../types/business.js';
import type { Types } from 'mongoose';

export interface AttendanceListFilters {
  employee_id?: string;
  date_from?: Date;
  date_to?: Date;
  scope?: Record<string, unknown>;
}

/**
 * Finds today's attendance doc for the given employee, creating it if it doesn't exist.
 * "Today" is determined by the caller passing a normalized Date at midnight UTC-like boundary.
 */
export async function findOrCreateAttendance(
  employeeId: string | Types.ObjectId,
  date: Date
): Promise<IAttendance> {
  const existing = await Attendance.findOne({ employee_id: employeeId, date }).lean();
  if (existing) return existing;

  const doc = new Attendance({ employee_id: employeeId, date, sessions: [], total_minutes: 0, is_checked_in: false });
  return (await doc.save()).toObject() as IAttendance;
}

export async function findAttendanceByEmployeeAndDate(
  employeeId: string | Types.ObjectId,
  date: Date
): Promise<IAttendance | null> {
  return Attendance.findOne({ employee_id: employeeId, date })
    .populate('employee_id', 'full_name department role_designation')
    .lean();
}

export async function findAttendanceById(id: string | Types.ObjectId): Promise<IAttendance | null> {
  return Attendance.findById(id)
    .populate('employee_id', 'full_name department role_designation')
    .lean();
}

export async function findAllAttendance(
  page: number,
  limit: number,
  filters: AttendanceListFilters
): Promise<{ data: IAttendance[]; total: number; page: number; limit: number; totalPages: number }> {
  const query: Record<string, unknown> = { ...filters.scope };

  if (filters.employee_id) query['employee_id'] = filters.employee_id;
  if (filters.date_from || filters.date_to) {
    const dateQ: Record<string, Date> = {};
    if (filters.date_from) dateQ['$gte'] = filters.date_from;
    if (filters.date_to) dateQ['$lte'] = filters.date_to;
    query['date'] = dateQ;
  }

  const [data, total] = await Promise.all([
    Attendance.find(query)
      .populate('employee_id', 'full_name department role_designation')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Push a new check-in session and mark is_checked_in = true.
 */
export async function pushCheckInSession(
  id: string | Types.ObjectId,
  checkInTime: Date
): Promise<IAttendance | null> {
  return Attendance.findByIdAndUpdate(
    id,
    {
      $push: { sessions: { check_in: checkInTime, check_out: null, duration_minutes: null } },
      $set: { is_checked_in: true },
    },
    { new: true, runValidators: true }
  )
    .populate('employee_id', 'full_name department')
    .lean();
}

/**
 * Close the latest open session (the one without check_out) and accumulate total_minutes.
 */
export async function closeLatestSession(
  id: string | Types.ObjectId,
  checkOutTime: Date,
  durationMinutes: number
): Promise<IAttendance | null> {
  // MongoDB positional operator requires a filter that matches the array element
  return Attendance.findOneAndUpdate(
    { _id: id, 'sessions.check_out': null },
    {
      $set: {
        'sessions.$.check_out': checkOutTime,
        'sessions.$.duration_minutes': durationMinutes,
        is_checked_in: false,
      },
      $inc: { total_minutes: durationMinutes },
    },
    { new: true, runValidators: true }
  )
    .populate('employee_id', 'full_name department')
    .lean();
}
