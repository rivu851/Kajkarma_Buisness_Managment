import { Report } from '../models/report.model.js';
import type { IReport } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface ReportListFilters {
  client_id?: string;
  project_id?: string;
  report_type?: string;
  month?: string;
}

export async function findAllReports(
  page: number,
  limit: number,
  filters: ReportListFilters,
  scope: Record<string, unknown> = {}
): Promise<PaginatedResult<IReport>> {
  const query: Record<string, unknown> = { ...scope };

  if (filters.client_id) query['client_id'] = filters.client_id;
  if (filters.project_id) query['project_id'] = filters.project_id;
  if (filters.report_type) query['report_type'] = filters.report_type;
  if (filters.month) {
    const d = new Date(filters.month);
    query['month'] = {
      $gte: new Date(d.getFullYear(), d.getMonth(), 1),
      $lte: new Date(d.getFullYear(), d.getMonth() + 1, 0),
    };
  }

  const [data, total] = await Promise.all([
    Report.find(query)
      .populate('client_id', 'company_name')
      .populate('project_id', 'project_name')
      .populate('uploaded_by', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ month: -1, created_at: -1 })
      .lean(),
    Report.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findReportById(id: string | Types.ObjectId): Promise<IReport | null> {
  return Report.findById(id)
    .populate('client_id', 'company_name')
    .populate('project_id', 'project_name')
    .populate('uploaded_by', 'name email')
    .lean();
}

export async function createReport(data: Partial<IReport>): Promise<IReport> {
  const report = new Report(data);
  return (await report.save()).toObject() as IReport;
}

export async function updateReportById(
  id: string | Types.ObjectId,
  data: Partial<IReport>
): Promise<IReport | null> {
  return Report.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('client_id', 'company_name')
    .populate('project_id', 'project_name')
    .populate('uploaded_by', 'name email')
    .lean();
}

export async function deleteReportById(id: string | Types.ObjectId): Promise<IReport | null> {
  return Report.findByIdAndDelete(id).lean();
}
