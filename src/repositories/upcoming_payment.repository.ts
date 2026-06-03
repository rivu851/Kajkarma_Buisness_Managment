import { UpcomingPayment } from '../models/upcoming_payment.model.js';
import type { IUpcomingPayment } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface UpcomingPaymentListFilters {
  client_id?: string;
  project_id?: string;
  payment_status?: string;
  payment_type?: string;
  assigned_follow_up_user?: string;
  due_within_days?: number;
}

const POPULATE_CLIENT = 'company_name contact_person_name';
const POPULATE_PROJECT = 'project_name';
const POPULATE_USER = 'name email';

export async function findAllUpcomingPayments(
  page: number,
  limit: number,
  filters: UpcomingPaymentListFilters
): Promise<PaginatedResult<IUpcomingPayment>> {
  const query: Record<string, unknown> = {};

  if (filters.client_id) query['client_id'] = filters.client_id;
  if (filters.project_id) query['project_id'] = filters.project_id;
  if (filters.payment_status) query['payment_status'] = filters.payment_status;
  if (filters.payment_type) query['payment_type'] = filters.payment_type;
  if (filters.assigned_follow_up_user) query['assigned_follow_up_user'] = filters.assigned_follow_up_user;
  if (filters.due_within_days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + filters.due_within_days);
    query['due_date'] = { $lte: cutoff };
  }

  const [data, total] = await Promise.all([
    UpcomingPayment.find(query)
      .populate('client_id', POPULATE_CLIENT)
      .populate('project_id', POPULATE_PROJECT)
      .populate('revenue_id', 'title amount received_amount status')
      .populate('assigned_follow_up_user', POPULATE_USER)
      .populate('created_by', POPULATE_USER)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ due_date: 1 })
      .lean(),
    UpcomingPayment.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findUpcomingPaymentById(
  id: string | Types.ObjectId
): Promise<IUpcomingPayment | null> {
  return UpcomingPayment.findById(id)
    .populate('client_id', POPULATE_CLIENT)
    .populate('project_id', POPULATE_PROJECT)
    .populate('revenue_id', 'title amount received_amount status')
    .populate('assigned_follow_up_user', POPULATE_USER)
    .populate('created_by', POPULATE_USER)
    .lean();
}

export async function createUpcomingPayment(
  data: Partial<IUpcomingPayment>
): Promise<IUpcomingPayment> {
  const record = new UpcomingPayment(data);
  return (await record.save()).toObject() as IUpcomingPayment;
}

export async function updateUpcomingPaymentById(
  id: string | Types.ObjectId,
  data: Partial<IUpcomingPayment>
): Promise<IUpcomingPayment | null> {
  return UpcomingPayment.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('client_id', POPULATE_CLIENT)
    .populate('project_id', POPULATE_PROJECT)
    .populate('revenue_id', 'title amount received_amount status')
    .populate('assigned_follow_up_user', POPULATE_USER)
    .populate('created_by', POPULATE_USER)
    .lean();
}

export async function deleteUpcomingPaymentById(
  id: string | Types.ObjectId
): Promise<IUpcomingPayment | null> {
  return UpcomingPayment.findByIdAndDelete(id).lean();
}

export async function findOverdueUpcomingPayments(): Promise<IUpcomingPayment[]> {
  return UpcomingPayment.find({
    payment_status: 'pending',
    due_date: { $lt: new Date() },
  }).lean();
}
