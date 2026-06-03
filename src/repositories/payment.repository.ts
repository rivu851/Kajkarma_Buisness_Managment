import { Payment } from '../models/payment.model.js';
import { Types } from 'mongoose';
import type { IPayment } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';

export interface PaymentListFilters {
  revenue_id?: string;
  client_id?: string;
  project_id?: string;
  payment_method?: string;
}

export async function findAllPayments(
  page: number,
  limit: number,
  filters: PaymentListFilters,
  search?: string
): Promise<PaginatedResult<IPayment>> {
  const query: Record<string, unknown> = {};

  if (filters.revenue_id) query['revenue_id'] = filters.revenue_id;
  if (filters.client_id) query['client_id'] = filters.client_id;
  if (filters.project_id) query['project_id'] = filters.project_id;
  if (filters.payment_method) query['payment_method'] = filters.payment_method;

  if (search) {
    query['reference_number'] = { $regex: search, $options: 'i' };
  }

  const [data, total] = await Promise.all([
    Payment.find(query)
      .populate('revenue_id', 'title amount received_amount status')
      .populate('client_id', 'company_name contact_person_name')
      .populate('project_id', 'project_name')
      .populate('created_by', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ payment_date: -1 })
      .lean(),
    Payment.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findPaymentById(id: string | Types.ObjectId): Promise<IPayment | null> {
  return Payment.findById(id)
    .populate('revenue_id', 'title amount received_amount status')
    .populate('client_id', 'company_name contact_person_name')
    .populate('project_id', 'project_name')
    .populate('created_by', 'name email')
    .lean();
}

export async function createPayment(data: Partial<IPayment>): Promise<IPayment> {
  const payment = new Payment(data);
  return (await payment.save()).toObject() as IPayment;
}

export async function updatePaymentById(
  id: string | Types.ObjectId,
  data: Partial<IPayment>
): Promise<IPayment | null> {
  return Payment.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('revenue_id', 'title amount received_amount status')
    .populate('client_id', 'company_name')
    .lean();
}

export async function deletePaymentById(id: string | Types.ObjectId): Promise<IPayment | null> {
  return Payment.findByIdAndDelete(id).lean();
}

export async function sumPaymentsByRevenue(revenueId: string | Types.ObjectId): Promise<number> {
  const id = typeof revenueId === 'string' ? new Types.ObjectId(revenueId) : revenueId;
  const result = await Payment.aggregate([
    { $match: { revenue_id: id } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total ?? 0;
}
