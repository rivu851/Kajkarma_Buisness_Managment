import { Lead } from '../models/lead.model.js';
import type { ILead, ILeadHistoryEntry } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface LeadListFilters {
  stage?: string;
  status?: string;
  assigned_user_id?: string;
  source?: string;
  scope?: Record<string, unknown>;
}

export async function findAllLeads(
  page: number,
  limit: number,
  filters: LeadListFilters,
  search?: string
): Promise<PaginatedResult<ILead>> {
  const query: Record<string, unknown> = { ...filters.scope };

  if (filters.stage) query['stage'] = filters.stage;
  if (filters.status) query['status'] = filters.status;
  if (filters.assigned_user_id) query['assigned_user_id'] = filters.assigned_user_id;
  if (filters.source) query['source'] = filters.source;

  if (search) {
    query['$or'] = [
      { lead_name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone_number: { $regex: search, $options: 'i' } },
      { company_name: { $regex: search, $options: 'i' } },
    ];
  }

  const [data, total] = await Promise.all([
    Lead.find(query)
      .populate('assigned_user_id', 'name email')
      .populate('created_by', 'name email')
      .populate('client_id', 'company_name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })
      .lean(),
    Lead.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findLeadById(id: string | Types.ObjectId): Promise<ILead | null> {
  return Lead.findById(id)
    .populate('assigned_user_id', 'name email')
    .populate('created_by', 'name email')
    .populate('client_id', 'company_name contact_person_name')
    .lean();
}

export async function createLead(data: Partial<ILead>): Promise<ILead> {
  const lead = new Lead(data);
  return (await lead.save()).toObject() as ILead;
}

export async function updateLeadById(
  id: string | Types.ObjectId,
  data: Partial<ILead>
): Promise<ILead | null> {
  return Lead.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('assigned_user_id', 'name email')
    .populate('created_by', 'name email')
    .populate('client_id', 'company_name')
    .lean();
}

export async function deleteLeadById(id: string | Types.ObjectId): Promise<ILead | null> {
  return Lead.findByIdAndDelete(id).lean();
}

export async function pushLeadHistory(
  id: string | Types.ObjectId,
  entry: ILeadHistoryEntry
): Promise<ILead | null> {
  return Lead.findByIdAndUpdate(
    id,
    { $push: { history: entry } },
    { new: true, runValidators: true }
  ).lean();
}
