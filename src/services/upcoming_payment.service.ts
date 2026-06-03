import {
  findAllUpcomingPayments,
  findUpcomingPaymentById,
  createUpcomingPayment,
  updateUpcomingPaymentById,
  deleteUpcomingPaymentById,
  findOverdueUpcomingPayments,
} from '../repositories/upcoming_payment.repository.js';
import { findClientById } from '../repositories/client.repository.js';
import { findRevenueById, updateRevenueById } from '../repositories/revenue.repository.js';
import { computeRevenueStatus } from '../services/revenue.service.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId } from '../utils/recordScope.js';
import type { IUpcomingPayment } from '../types/business.js';
import type { UpcomingPaymentType, UpcomingPaymentStatus } from '../constants/enums.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

export async function listUpcomingPayments(
  page: number,
  limit: number,
  filters: {
    client_id?: string;
    project_id?: string;
    payment_status?: string;
    payment_type?: string;
    assigned_follow_up_user?: string;
    due_within_days?: number;
  }
): Promise<PaginatedResult<IUpcomingPayment>> {
  return findAllUpcomingPayments(page, limit, omitUndefined(filters));
}

export async function getUpcomingPaymentById(id: string): Promise<IUpcomingPayment> {
  const record = await findUpcomingPaymentById(id);
  if (!record) throw new AppError('Upcoming payment not found', 404);
  return record;
}

export async function createUpcomingPaymentEntry(
  data: {
    client_id: string;
    project_id?: string;
    revenue_id?: string;
    amount: number;
    due_date: Date;
    payment_type: UpcomingPaymentType;
    reminder_date?: Date;
    assigned_follow_up_user?: string;
    notes?: string;
  },
  user: JwtPayload
): Promise<IUpcomingPayment> {
  const client = await findClientById(data.client_id);
  if (!client) throw new AppError('Client not found', 404);

  if (data.revenue_id) {
    const revenue = await findRevenueById(data.revenue_id);
    if (!revenue) throw new AppError('Revenue record not found', 404);
  }

  if (data.reminder_date && data.reminder_date >= data.due_date) {
    throw new AppError('Reminder date must be before due date', 400);
  }

  const payload: Partial<IUpcomingPayment> = {
    client_id: toObjectId(data.client_id),
    amount: data.amount,
    due_date: data.due_date,
    payment_type: data.payment_type,
    payment_status: 'pending',
    created_by: toObjectId(user.userId),
    ...(data.project_id ? { project_id: toObjectId(data.project_id) } : {}),
    ...(data.revenue_id ? { revenue_id: toObjectId(data.revenue_id) } : {}),
    ...(data.reminder_date ? { reminder_date: data.reminder_date } : {}),
    ...(data.assigned_follow_up_user
      ? { assigned_follow_up_user: toObjectId(data.assigned_follow_up_user) }
      : {}),
    ...(data.notes ? { notes: data.notes } : {}),
  };

  const created = await createUpcomingPayment(payload);
  return (await findUpcomingPaymentById(created._id))!;
}

export async function updateUpcomingPaymentEntry(
  id: string,
  data: {
    amount?: number;
    due_date?: Date;
    payment_type?: UpcomingPaymentType;
    reminder_date?: Date;
    assigned_follow_up_user?: string;
    notes?: string;
  }
): Promise<IUpcomingPayment> {
  const existing = await findUpcomingPaymentById(id);
  if (!existing) throw new AppError('Upcoming payment not found', 404);

  const locked: UpcomingPaymentStatus[] = ['received', 'cancelled'];
  if (locked.includes(existing.payment_status)) {
    throw new AppError('Cannot edit a received or cancelled upcoming payment', 422);
  }

  const dueDate = data.due_date ?? existing.due_date;
  const reminderDate = data.reminder_date ?? existing.reminder_date;
  if (reminderDate && reminderDate >= dueDate) {
    throw new AppError('Reminder date must be before due date', 400);
  }

  const update: Partial<IUpcomingPayment> = {
    ...(data.amount !== undefined ? { amount: data.amount } : {}),
    ...(data.due_date ? { due_date: data.due_date } : {}),
    ...(data.payment_type ? { payment_type: data.payment_type } : {}),
    ...(data.reminder_date ? { reminder_date: data.reminder_date } : {}),
    ...(data.assigned_follow_up_user ? { assigned_follow_up_user: toObjectId(data.assigned_follow_up_user) } : {}),
    ...(data.notes ? { notes: data.notes } : {}),
  };

  const updated = await updateUpcomingPaymentById(id, update);
  if (!updated) throw new AppError('Upcoming payment not found', 404);
  return updated;
}

export async function markUpcomingPaymentReceived(
  id: string,
  notes?: string
): Promise<IUpcomingPayment> {
  const existing = await findUpcomingPaymentById(id);
  if (!existing) throw new AppError('Upcoming payment not found', 404);

  if (existing.payment_status === 'received') {
    throw new AppError('Payment is already marked as received', 422);
  }
  if (existing.payment_status === 'cancelled') {
    throw new AppError('Cannot receive a cancelled payment', 422);
  }

  const update: Partial<IUpcomingPayment> = { payment_status: 'received' };
  if (notes) update.notes = notes;

  const updated = await updateUpcomingPaymentById(id, update);
  if (!updated) throw new AppError('Upcoming payment not found', 404);

  // Sync linked revenue record if present
  if (existing.revenue_id) {
    await syncLinkedRevenue(existing.revenue_id.toString(), existing.amount);
  }

  return (await findUpcomingPaymentById(id))!;
}

export async function cancelUpcomingPayment(
  id: string,
  notes?: string
): Promise<IUpcomingPayment> {
  const existing = await findUpcomingPaymentById(id);
  if (!existing) throw new AppError('Upcoming payment not found', 404);

  if (existing.payment_status === 'received') {
    throw new AppError('Cannot cancel a received payment', 422);
  }
  if (existing.payment_status === 'cancelled') {
    throw new AppError('Payment is already cancelled', 422);
  }

  const update: Partial<IUpcomingPayment> = { payment_status: 'cancelled' };
  if (notes) update.notes = notes;

  const updated = await updateUpcomingPaymentById(id, update);
  if (!updated) throw new AppError('Upcoming payment not found', 404);
  return updated;
}

export async function flagOverduePayments(): Promise<number> {
  const overdue = await findOverdueUpcomingPayments();
  await Promise.all(
    overdue.map((p) =>
      updateUpcomingPaymentById(p._id, { payment_status: 'overdue' })
    )
  );
  return overdue.length;
}

export async function removeUpcomingPayment(id: string): Promise<void> {
  const existing = await findUpcomingPaymentById(id);
  if (!existing) throw new AppError('Upcoming payment not found', 404);

  if (existing.payment_status === 'received') {
    throw new AppError('Cannot delete a received payment record', 422);
  }

  await deleteUpcomingPaymentById(id);
}

async function syncLinkedRevenue(revenueId: string, receivedAmount: number): Promise<void> {
  const revenue = await findRevenueById(revenueId);
  if (!revenue) return;

  const newReceived = (revenue.received_amount ?? 0) + receivedAmount;
  const status = computeRevenueStatus(revenue.amount, newReceived);
  await updateRevenueById(revenueId, { received_amount: newReceived, status });
}
