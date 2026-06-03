import {
  findAllPayments,
  findPaymentById,
  createPayment,
  updatePaymentById,
  deletePaymentById,
  sumPaymentsByRevenue,
} from '../repositories/payment.repository.js';
import {
  findRevenueById,
  updateRevenueById,
} from '../repositories/revenue.repository.js';

import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId, resolveId } from '../utils/recordScope.js';
import { computeRevenueStatus } from '../services/revenue.service.js';
import type { IPayment } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

async function syncRevenueAfterPayment(revenueId: string): Promise<void> {
  const revenue = await findRevenueById(revenueId);
  if (!revenue) return;
  const received = await sumPaymentsByRevenue(revenueId);
  const status = computeRevenueStatus(revenue.amount, received);
  await updateRevenueById(revenueId, { received_amount: received, status });
}

export async function listPayments(
  page: number,
  limit: number,
  filters: {
    revenue_id?: string;
    client_id?: string;
    project_id?: string;
    payment_method?: string;
    search?: string;
  }
): Promise<PaginatedResult<IPayment>> {
  return findAllPayments(
    page,
    limit,
    omitUndefined({
      revenue_id: filters.revenue_id,
      client_id: filters.client_id,
      project_id: filters.project_id,
      payment_method: filters.payment_method,
    }),
    filters.search
  );
}

export async function getPaymentById(id: string): Promise<IPayment> {
  const payment = await findPaymentById(id);
  if (!payment) throw new AppError('Payment not found', 404);
  return payment;
}

export async function recordPayment(
  data: Partial<IPayment> & { revenue_id: string },
  user: JwtPayload
): Promise<IPayment> {
  const revenue = await findRevenueById(data.revenue_id);
  if (!revenue) throw new AppError('Revenue not found', 404);

  const payment = await createPayment({
    revenue_id: toObjectId(data.revenue_id),
    client_id: revenue.client_id,
    project_id: revenue.project_id ?? undefined,
    amount: data.amount!,
    payment_date: data.payment_date!,
    payment_method: data.payment_method!,
    reference_number: data.reference_number,
    notes: data.notes,
    created_by: toObjectId(user.userId),
  } as Partial<IPayment>);

  await syncRevenueAfterPayment(data.revenue_id);

  return (await findPaymentById(payment._id))!;
}

export async function updatePayment(id: string, data: Partial<IPayment>): Promise<IPayment> {
  const existing = await findPaymentById(id);
  if (!existing) throw new AppError('Payment not found', 404);

  const updated = await updatePaymentById(id, omitUndefined(data));
  if (!updated) throw new AppError('Payment not found', 404);

  await syncRevenueAfterPayment(resolveId(existing.revenue_id));

  return (await findPaymentById(id))!;
}

export async function removePayment(id: string): Promise<void> {
  const existing = await findPaymentById(id);
  if (!existing) throw new AppError('Payment not found', 404);

  await deletePaymentById(id);
  await syncRevenueAfterPayment(resolveId(existing.revenue_id));
}
