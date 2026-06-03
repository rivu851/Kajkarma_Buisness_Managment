import {
  findAllReimbursements,
  findReimbursementById,
  createReimbursement,
  updateReimbursementById,
  deleteReimbursementById,
} from '../repositories/reimbursement.repository.js';
import { findEmployeeById } from '../repositories/employee.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId } from '../utils/recordScope.js';
import type { IReimbursement } from '../types/business.js';
import type { ReimbursementCategory, ReimbursementStatus } from '../constants/enums.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';
import { SYSTEM_ROLES } from '../constants/roles.js';

const MANAGER_ROLES = new Set<string>([
  SYSTEM_ROLES.SUPER_ADMIN,
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.HR,
  SYSTEM_ROLES.FINANCE,
  SYSTEM_ROLES.PROJECT_MANAGER,
]);

export async function listReimbursements(
  page: number,
  limit: number,
  filters: {
    employee_id?: string;
    status?: string;
    category?: string;
    project_id?: string;
    client_id?: string;
  },
  user: JwtPayload
): Promise<PaginatedResult<IReimbursement>> {
  const scope: Record<string, unknown> = MANAGER_ROLES.has(user.roleName) ? {} : {};
  return findAllReimbursements(page, limit, omitUndefined(filters), scope);
}

export async function getReimbursementById(id: string): Promise<IReimbursement> {
  const record = await findReimbursementById(id);
  if (!record) throw new AppError('Reimbursement not found', 404);
  return record;
}

export async function submitReimbursement(
  data: {
    employee_id: string;
    expense_title: string;
    amount: number;
    expense_date: Date;
    reason: string;
    category: ReimbursementCategory;
    project_id?: string;
    client_id?: string;
    bill_attachment_url?: string;
    notes?: string;
  }
): Promise<IReimbursement> {
  const employee = await findEmployeeById(data.employee_id);
  if (!employee) throw new AppError('Employee not found', 404);

  const payload: Partial<IReimbursement> = {
    employee_id: toObjectId(data.employee_id),
    expense_title: data.expense_title,
    amount: data.amount,
    expense_date: data.expense_date,
    reason: data.reason,
    category: data.category,
    status: 'submitted',
    ...(data.project_id ? { project_id: toObjectId(data.project_id) } : {}),
    ...(data.client_id ? { client_id: toObjectId(data.client_id) } : {}),
    ...(data.bill_attachment_url ? { bill_attachment_url: data.bill_attachment_url } : {}),
    ...(data.notes ? { notes: data.notes } : {}),
  };

  const created = await createReimbursement(payload);
  const saved = (await findReimbursementById(created._id))!;
  const { onReimbursementSubmitted } = await import('./reminder.service.js');
  const { getReimbursementApproverIds, getSuperAdminUserIds } = await import('../utils/reminderApprovers.js');
  void onReimbursementSubmitted(
    saved._id as import('mongoose').Types.ObjectId,
    saved.expense_title,
    saved.amount,
    await getReimbursementApproverIds(),
    await getSuperAdminUserIds()
  ).catch(() => undefined);
  return saved;
}

export async function updateReimbursement(
  id: string,
  data: {
    expense_title?: string;
    amount?: number;
    expense_date?: Date;
    reason?: string;
    category?: ReimbursementCategory;
    bill_attachment_url?: string;
    notes?: string;
  }
): Promise<IReimbursement> {
  const existing = await findReimbursementById(id);
  if (!existing) throw new AppError('Reimbursement not found', 404);

  const locked: ReimbursementStatus[] = ['approved', 'paid'];
  if (locked.includes(existing.status)) {
    throw new AppError('Cannot edit a reimbursement that is approved or paid', 422);
  }

  const updated = await updateReimbursementById(id, omitUndefined(data) as Partial<IReimbursement>);
  if (!updated) throw new AppError('Reimbursement not found', 404);
  return updated;
}

// Amounts at or above this threshold require Super Admin approval (PRD 3.15 NOTE).
// Override via env var REIMBURSEMENT_APPROVAL_THRESHOLD (in same currency unit as amounts).
const APPROVAL_THRESHOLD = Number(process.env['REIMBURSEMENT_APPROVAL_THRESHOLD'] ?? 10000);

export async function reviewReimbursement(
  id: string,
  action: 'approve' | 'reject' | 'under_review',
  user: JwtPayload,
  notes?: string
): Promise<IReimbursement> {
  const existing = await findReimbursementById(id);
  if (!existing) throw new AppError('Reimbursement not found', 404);
  if (existing.status === 'paid') throw new AppError('Cannot change status of a paid reimbursement', 422);

  if (action === 'approve' && existing.amount >= APPROVAL_THRESHOLD && user.roleName !== SYSTEM_ROLES.SUPER_ADMIN) {
    throw new AppError(
      `Reimbursements of ${existing.amount} or above require Super Admin approval`,
      403
    );
  }

  const newStatus: ReimbursementStatus =
    action === 'approve' ? 'approved' :
    action === 'reject' ? 'rejected' : 'under_review';

  const update: Partial<IReimbursement> = { status: newStatus };
  if (action === 'approve') {
    update.approved_by = toObjectId(user.userId);
    update.approval_date = new Date();
  }
  if (notes) update.notes = notes;

  const updated = await updateReimbursementById(id, update);
  if (!updated) throw new AppError('Reimbursement not found', 404);
  return updated;
}

export async function markReimbursementPaid(
  id: string,
  paid_date: Date,
  notes?: string
): Promise<IReimbursement> {
  const existing = await findReimbursementById(id);
  if (!existing) throw new AppError('Reimbursement not found', 404);
  if (existing.status !== 'approved') {
    throw new AppError('Only approved reimbursements can be marked as paid', 422);
  }

  const update: Partial<IReimbursement> = { status: 'paid', paid_date };
  if (notes) update.notes = notes;

  const updated = await updateReimbursementById(id, update);
  if (!updated) throw new AppError('Reimbursement not found', 404);
  return updated;
}

export async function removeReimbursement(id: string): Promise<void> {
  const existing = await findReimbursementById(id);
  if (!existing) throw new AppError('Reimbursement not found', 404);
  if (['approved', 'paid'].includes(existing.status)) {
    throw new AppError('Cannot delete an approved or paid reimbursement', 422);
  }
  await deleteReimbursementById(id);
}
