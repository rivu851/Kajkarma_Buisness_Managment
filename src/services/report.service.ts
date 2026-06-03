import {
  findAllReports,
  findReportById,
  createReport,
  updateReportById,
  deleteReportById,
} from '../repositories/report.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId } from '../utils/recordScope.js';
import type { IReport } from '../types/business.js';
import type { ReportType } from '../constants/enums.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

export async function listReports(
  page: number,
  limit: number,
  filters: {
    client_id?: string;
    project_id?: string;
    report_type?: string;
    month?: string;
  }
): Promise<PaginatedResult<IReport>> {
  return findAllReports(page, limit, omitUndefined(filters));
}

export async function getReportById(id: string): Promise<IReport> {
  const report = await findReportById(id);
  if (!report) throw new AppError('Report not found', 404);
  return report;
}

export async function uploadReport(
  data: {
    client_id: string;
    project_id?: string;
    report_title: string;
    report_type: ReportType;
    month: Date;
    file_url: string;
  },
  user: JwtPayload
): Promise<IReport> {
  const payload: Partial<IReport> = {
    client_id: toObjectId(data.client_id),
    report_title: data.report_title,
    report_type: data.report_type,
    month: data.month,
    file_url: data.file_url,
    uploaded_by: toObjectId(user.userId),
    ...(data.project_id ? { project_id: toObjectId(data.project_id) } : {}),
  };

  const created = await createReport(payload);
  return (await findReportById(created._id))!;
}

export async function updateReport(
  id: string,
  data: {
    report_title?: string;
    report_type?: ReportType;
    month?: Date;
    file_url?: string;
  }
): Promise<IReport> {
  const existing = await findReportById(id);
  if (!existing) throw new AppError('Report not found', 404);

  const updated = await updateReportById(id, omitUndefined(data));
  if (!updated) throw new AppError('Report not found', 404);
  return updated;
}

export async function removeReport(id: string): Promise<void> {
  const existing = await findReportById(id);
  if (!existing) throw new AppError('Report not found', 404);
  await deleteReportById(id);
}
