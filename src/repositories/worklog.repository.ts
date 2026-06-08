import { Worklog } from '../models/worklog.model.js';
import type { IWorklog } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';
import type { WorklogGroup } from '../types/business.js';

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

export interface GroupedWorklogFilters {
  employee_id?: string;
  work_status?: string;
  date_from?: Date;
  date_to?: Date;
  scope?: Record<string, unknown>;
}

export async function findWorklogsGroupedByProject(
  filters: GroupedWorklogFilters
): Promise<WorklogGroup[]> {
  const match: Record<string, unknown> = { ...filters.scope };

  if (filters.employee_id) match['employee_id'] = filters.employee_id;
  if (filters.work_status) match['work_status'] = filters.work_status;
  if (filters.date_from || filters.date_to) {
    const dateQ: Record<string, Date> = {};
    if (filters.date_from) dateQ['$gte'] = filters.date_from;
    if (filters.date_to) dateQ['$lte'] = filters.date_to;
    match['date'] = dateQ;
  }

  const results = await Worklog.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee_id',
        foreignField: '_id',
        as: 'employee',
        pipeline: [{ $project: { full_name: 1, department: 1, role_designation: 1 } }],
      },
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    { $sort: { date: -1, created_at: -1 } },
    {
      $group: {
        _id: '$project_id',
        total_hours: { $sum: '$time_spent_hours' },
        entries_count: { $sum: 1 },
        logs: { $push: '$$ROOT' },
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: '_id',
        foreignField: '_id',
        as: 'project',
        pipeline: [{ $project: { project_name: 1, status: 1, client_id: 1 } }],
      },
    },
    { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        project_id: '$_id',
        project_name: '$project.project_name',
        project_status: '$project.status',
        client_id: '$project.client_id',
        total_hours: { $round: ['$total_hours', 2] },
        entries_count: 1,
        logs: 1,
      },
    },
    { $sort: { total_hours: -1 } },
  ]);

  return results as WorklogGroup[];
}
