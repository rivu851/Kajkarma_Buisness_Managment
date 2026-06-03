import { Reimbursement } from '../models/reimbursement.model.js';
import type { IReimbursement } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface ReimbursementListFilters {
  employee_id?: string;
  status?: string;
  category?: string;
  project_id?: string;
  client_id?: string;
}

const POPULATE_EMPLOYEE = 'full_name department role_designation';
const POPULATE_USER = 'name email';

export async function findAllReimbursements(
  page: number,
  limit: number,
  filters: ReimbursementListFilters,
  scope: Record<string, unknown> = {}
): Promise<PaginatedResult<IReimbursement>> {
  const query: Record<string, unknown> = { ...scope };

  if (filters.employee_id) query['employee_id'] = filters.employee_id;
  if (filters.status) query['status'] = filters.status;
  if (filters.category) query['category'] = filters.category;
  if (filters.project_id) query['project_id'] = filters.project_id;
  if (filters.client_id) query['client_id'] = filters.client_id;

  const [data, total] = await Promise.all([
    Reimbursement.find(query)
      .populate('employee_id', POPULATE_EMPLOYEE)
      .populate('approved_by', POPULATE_USER)
      .populate('project_id', 'project_name')
      .populate('client_id', 'company_name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })
      .lean(),
    Reimbursement.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findReimbursementById(
  id: string | Types.ObjectId
): Promise<IReimbursement | null> {
  return Reimbursement.findById(id)
    .populate('employee_id', POPULATE_EMPLOYEE)
    .populate('approved_by', POPULATE_USER)
    .populate('project_id', 'project_name')
    .populate('client_id', 'company_name')
    .lean();
}

export async function createReimbursement(data: Partial<IReimbursement>): Promise<IReimbursement> {
  const reimbursement = new Reimbursement(data);
  return (await reimbursement.save()).toObject() as IReimbursement;
}

export async function updateReimbursementById(
  id: string | Types.ObjectId,
  data: Partial<IReimbursement>
): Promise<IReimbursement | null> {
  return Reimbursement.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('employee_id', POPULATE_EMPLOYEE)
    .populate('approved_by', POPULATE_USER)
    .populate('project_id', 'project_name')
    .populate('client_id', 'company_name')
    .lean();
}

export async function deleteReimbursementById(
  id: string | Types.ObjectId
): Promise<IReimbursement | null> {
  return Reimbursement.findByIdAndDelete(id).lean();
}
