import { Revenue } from '../models/revenue.model.js';
import type { IRevenue } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface RevenueListFilters {
  client_id?: string;
  project_id?: string;
  status?: string;
  type?: string;
}

export async function findAllRevenues(
  page: number,
  limit: number,
  filters: RevenueListFilters,
  search?: string
): Promise<PaginatedResult<IRevenue>> {
  const query: Record<string, unknown> = {};

  if (filters.client_id) query['client_id'] = filters.client_id;
  if (filters.project_id) query['project_id'] = filters.project_id;
  if (filters.status) query['status'] = filters.status;
  if (filters.type) query['type'] = filters.type;

  if (search) {
    query['title'] = { $regex: search, $options: 'i' };
  }

  const [data, total] = await Promise.all([
    Revenue.find(query)
      .populate('client_id', 'company_name contact_person_name')
      .populate('project_id', 'project_name category')
      .populate('created_by', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ revenue_date: -1 })
      .lean(),
    Revenue.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findRevenueById(id: string | Types.ObjectId): Promise<IRevenue | null> {
  return Revenue.findById(id)
    .populate('client_id', 'company_name contact_person_name status')
    .populate('project_id', 'project_name category status')
    .populate('created_by', 'name email')
    .lean();
}

export async function createRevenue(data: Partial<IRevenue>): Promise<IRevenue> {
  const revenue = new Revenue(data);
  return (await revenue.save()).toObject() as IRevenue;
}

export async function updateRevenueById(
  id: string | Types.ObjectId,
  data: Partial<IRevenue>
): Promise<IRevenue | null> {
  return Revenue.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('client_id', 'company_name')
    .populate('project_id', 'project_name')
    .populate('created_by', 'name email')
    .lean();
}

export async function deleteRevenueById(id: string | Types.ObjectId): Promise<IRevenue | null> {
  return Revenue.findByIdAndDelete(id).lean();
}

export async function revenueExists(id: string | Types.ObjectId): Promise<boolean> {
  return (await Revenue.countDocuments({ _id: id })) > 0;
}
