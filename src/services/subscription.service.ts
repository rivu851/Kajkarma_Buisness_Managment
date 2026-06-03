import {
  findAllSubscriptions,
  findSubscriptionById,
  createSubscription,
  updateSubscriptionById,
  deleteSubscriptionById,
  findExpiringSoon,
} from '../repositories/subscription.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId } from '../utils/recordScope.js';
import type { ISubscription } from '../types/business.js';
import type { BillingCycle, SubscriptionStatus } from '../constants/enums.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

export async function listSubscriptions(
  page: number,
  limit: number,
  filters: {
    status?: string;
    billing_cycle?: string;
    provider?: string;
  }
): Promise<PaginatedResult<ISubscription>> {
  return findAllSubscriptions(page, limit, omitUndefined(filters));
}

export async function getSubscriptionById(id: string): Promise<ISubscription> {
  const record = await findSubscriptionById(id);
  if (!record) throw new AppError('Subscription not found', 404);
  return record;
}

export async function createSubscriptionEntry(
  data: {
    plan_name: string;
    provider: string;
    start_date: Date;
    end_date: Date;
    renewal_date: Date;
    amount: number;
    billing_cycle: BillingCycle;
    assigned_to?: string;
    notes?: string;
  },
  user: JwtPayload
): Promise<ISubscription> {
  const payload: Partial<ISubscription> = {
    plan_name: data.plan_name,
    provider: data.provider,
    start_date: data.start_date,
    end_date: data.end_date,
    renewal_date: data.renewal_date,
    amount: data.amount,
    billing_cycle: data.billing_cycle,
    status: computeStatus(data.end_date, data.renewal_date),
    created_by: toObjectId(user.userId),
    ...(data.assigned_to ? { assigned_to: data.assigned_to } : {}),
    ...(data.notes ? { notes: data.notes } : {}),
  };

  const created = await createSubscription(payload);
  return (await findSubscriptionById(created._id))!;
}

export async function updateSubscriptionEntry(
  id: string,
  data: {
    plan_name?: string;
    provider?: string;
    start_date?: Date;
    end_date?: Date;
    renewal_date?: Date;
    amount?: number;
    billing_cycle?: BillingCycle;
    status?: SubscriptionStatus;
    assigned_to?: string;
    notes?: string;
  }
): Promise<ISubscription> {
  const existing = await findSubscriptionById(id);
  if (!existing) throw new AppError('Subscription not found', 404);

  const end_date = data.end_date ?? existing.end_date;
  const renewal_date = data.renewal_date ?? existing.renewal_date;

  const updated = await updateSubscriptionById(
    id,
    omitUndefined({
      ...data,
      status: data.status ?? computeStatus(end_date, renewal_date),
    })
  );
  if (!updated) throw new AppError('Subscription not found', 404);
  if (updated.status === 'expired' || updated.status === 'cancelled') {
    const { closePendingRemindersForRecord } = await import('./reminder.service.js');
    void closePendingRemindersForRecord(
      'subscriptions',
      updated._id as import('mongoose').Types.ObjectId
    ).catch(() => undefined);
  }
  return updated;
}

export async function renewSubscription(
  id: string,
  data: { end_date: Date; renewal_date: Date; amount?: number }
): Promise<ISubscription> {
  const existing = await findSubscriptionById(id);
  if (!existing) throw new AppError('Subscription not found', 404);

  const updated = await updateSubscriptionById(id, {
    end_date: data.end_date,
    renewal_date: data.renewal_date,
    ...(data.amount !== undefined ? { amount: data.amount } : {}),
    status: computeStatus(data.end_date, data.renewal_date),
  });
  if (!updated) throw new AppError('Subscription not found', 404);
  return updated;
}

export async function removeSubscription(id: string): Promise<void> {
  const existing = await findSubscriptionById(id);
  if (!existing) throw new AppError('Subscription not found', 404);
  await deleteSubscriptionById(id);
}

export async function getExpiringSoon(days = 7): Promise<ISubscription[]> {
  return findExpiringSoon(days);
}

function computeStatus(end_date: Date, renewal_date: Date): SubscriptionStatus {
  const now = new Date();
  if (end_date < now) return 'expired';
  const daysToRenewal = (renewal_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysToRenewal <= 7) return 'expiring_soon';
  return 'active';
}
