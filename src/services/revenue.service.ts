import {
  findAllRevenues,
  findRevenueById,
  createRevenue,
  updateRevenueById,
  deleteRevenueById,
} from '../repositories/revenue.repository.js';
import {
  createUpcomingPayment,
  deleteUpcomingPaymentsByRevenueId,
} from '../repositories/upcoming_payment.repository.js';
import { clientExists } from '../repositories/client.repository.js';
import { projectExists } from '../repositories/project.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId } from '../utils/recordScope.js';
import type { IRevenue } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

export async function listRevenues(
  page: number,
  limit: number,
  filters: {
    client_id?: string;
    project_id?: string;
    status?: string;
    type?: string;
    search?: string;
  }
): Promise<PaginatedResult<IRevenue>> {
  return findAllRevenues(
    page,
    limit,
    omitUndefined({
      client_id: filters.client_id,
      project_id: filters.project_id,
      status: filters.status,
      type: filters.type,
    }),
    filters.search
  );
}

export async function getRevenueById(id: string): Promise<IRevenue> {
  const revenue = await findRevenueById(id);
  if (!revenue) throw new AppError('Revenue not found', 404);
  return revenue;
}

export async function createNewRevenue(
  data: Partial<IRevenue> & { client_id: string },
  user: JwtPayload
): Promise<IRevenue> {
  if (!(await clientExists(data.client_id))) {
    throw new AppError('Client not found', 404);
  }
  if (data.project_id && !(await projectExists(data.project_id as unknown as string))) {
    throw new AppError('Project not found', 404);
  }

  const revenue = await createRevenue({
    client_id: toObjectId(data.client_id),
    project_id: data.project_id ? toObjectId(data.project_id as unknown as string) : undefined,
    title: data.title!,
    amount: data.amount!,
    received_amount: 0,
    revenue_date: data.revenue_date!,
    due_date: data.due_date,
    type: data.type!,
    status: 'pending',
    notes: data.notes,
    created_by: toObjectId(user.userId),
  } as Partial<IRevenue>);

  const populated = (await findRevenueById(revenue._id))!;

  if (populated.due_date) {
    await createUpcomingPayment({
      client_id: populated.client_id,
      revenue_id: populated._id,
      amount: populated.amount,
      due_date: populated.due_date,
      payment_type: 'confirmed',
      payment_status: 'pending',
      created_by: populated.created_by,
      ...(populated.project_id ? { project_id: populated.project_id } : {}),
    });
  }

  return populated;
}

export async function updateRevenue(id: string, data: Partial<IRevenue>): Promise<IRevenue> {
  const existing = await findRevenueById(id);
  if (!existing) throw new AppError('Revenue not found', 404);

  if (data.client_id && !(await clientExists(data.client_id as unknown as string))) {
    throw new AppError('Client not found', 404);
  }
  if (data.project_id && !(await projectExists(data.project_id as unknown as string))) {
    throw new AppError('Project not found', 404);
  }

  const updated = await updateRevenueById(id, omitUndefined(data));
  if (!updated) throw new AppError('Revenue not found', 404);
  return updated;
}

export async function removeRevenue(id: string): Promise<void> {
  const existing = await findRevenueById(id);
  if (!existing) throw new AppError('Revenue not found', 404);
  if (existing.received_amount > 0) {
    throw new AppError('Cannot delete revenue with recorded payments', 422);
  }
  await deleteUpcomingPaymentsByRevenueId(id);
  await deleteRevenueById(id);
}

export function computeRevenueStatus(amount: number, received: number): IRevenue['status'] {
  if (received <= 0) return 'pending';
  if (received >= amount) return 'received';
  return 'partial';
}
