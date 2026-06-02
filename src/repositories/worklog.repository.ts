import { Worklog } from '../models/worklog.model.js';
import type { IWorklog } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface WorklogListFilters {
  employee_id?: string;
  project_id?: string;
  work_status?: string;
  date_from?: Date;
  date_to?: Date;
  scope?: Record<string, unknown>;
}

export async function findAllWorklogs(
  page: number,
  limit: number,
  filters: WorklogListFilters
): Promise<PaginatedResult<IWorklog>> {
  const query: Record<string, unknown> = { ...filters.scope };

  if (filters.employee_id) query['employee_id'] = filters.employee_id;
  if (filters.project_id) query['project_id'] = filters.project_id;
  if (filters.work_status) query['work_status'] = filters.work_status;

  if (filters.date_from || filters.date_to) {
    const dateQuery: Record<string, Date> = {};
    if (filters.date_from) dateQuery['$gte'] = filters.date_from;
    if (filters.date_to) dateQuery['$lte'] = filters.date_to;
    query['date'] = dateQuery;
  }

  const [data, total] = await Promise.all([
    Worklog.find(query)
      .populate('employee_id', 'full_name department role_designation')
      .populate('project_id', 'project_name status client_id')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ date: -1, created_at: -1 })
      .lean(),
    Worklog.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findWorklogById(id: string | Types.ObjectId): Promise<IWorklog | null> {
  return Worklog.findById(id)
    .populate('employee_id', 'full_name department')
    .populate('project_id', 'project_name client_id')
    .lean();
}

export async function createWorklog(data: Partial<IWorklog>): Promise<IWorklog> {
  const worklog = new Worklog(data);
  return (await worklog.save()).toObject() as IWorklog;
}

export async function updateWorklogById(
  id: string | Types.ObjectId,
  data: Partial<IWorklog>
): Promise<IWorklog | null> {
  return Worklog.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('employee_id', 'full_name')
    .populate('project_id', 'project_name')
    .lean();
}

export async function deleteWorklogById(id: string | Types.ObjectId): Promise<IWorklog | null> {
  return Worklog.findByIdAndDelete(id).lean();
}
