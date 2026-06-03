import { Subscription } from '../models/subscription.model.js';
import type { ISubscription } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface SubscriptionListFilters {
  status?: string;
  billing_cycle?: string;
  provider?: string;
}

export async function findAllSubscriptions(
  page: number,
  limit: number,
  filters: SubscriptionListFilters
): Promise<PaginatedResult<ISubscription>> {
  const query: Record<string, unknown> = {};

  if (filters.status) query['status'] = filters.status;
  if (filters.billing_cycle) query['billing_cycle'] = filters.billing_cycle;
  if (filters.provider) query['provider'] = new RegExp(filters.provider, 'i');

  const [data, total] = await Promise.all([
    Subscription.find(query)
      .populate('created_by', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ renewal_date: 1 })
      .lean(),
    Subscription.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findSubscriptionById(
  id: string | Types.ObjectId
): Promise<ISubscription | null> {
  return Subscription.findById(id).populate('created_by', 'name email').lean();
}

export async function createSubscription(data: Partial<ISubscription>): Promise<ISubscription> {
  const subscription = new Subscription(data);
  return (await subscription.save()).toObject() as ISubscription;
}

export async function updateSubscriptionById(
  id: string | Types.ObjectId,
  data: Partial<ISubscription>
): Promise<ISubscription | null> {
  return Subscription.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('created_by', 'name email')
    .lean();
}

export async function deleteSubscriptionById(
  id: string | Types.ObjectId
): Promise<ISubscription | null> {
  return Subscription.findByIdAndDelete(id).lean();
}

export async function findExpiringSoon(thresholdDays: number): Promise<ISubscription[]> {
  const now = new Date();
  const threshold = new Date(now.getTime() + thresholdDays * 24 * 60 * 60 * 1000);
  return Subscription.find({
    status: { $in: ['active', 'expiring_soon'] },
    renewal_date: { $lte: threshold, $gte: now },
  }).lean();
}
