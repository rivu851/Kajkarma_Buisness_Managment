import {
  findAllSalaries,
  findSalaryById,
  findSalaryByEmployeeAndPeriod,
  createSalary,
  updateSalaryById,
  deleteSalaryById,
} from '../repositories/salary.repository.js';
import { findEmployeeById } from '../repositories/employee.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId } from '../utils/recordScope.js';
import type { ISalary } from '../types/business.js';
import type { SalaryPaymentMode } from '../constants/enums.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

function calcNetSalary(base: number, bonus: number, deductions: number): number {
  return Math.max(0, base + bonus - deductions);
}

export async function listSalaries(
  page: number,
  limit: number,
  filters: {
    employee_id?: string;
    month?: number;
    year?: number;
    status?: string;
  }
): Promise<PaginatedResult<ISalary>> {
  return findAllSalaries(page, limit, omitUndefined(filters));
}

export async function getSalaryById(id: string): Promise<ISalary> {
  const salary = await findSalaryById(id);
  if (!salary) throw new AppError('Salary record not found', 404);
  return salary;
}

export async function createSalaryEntry(
  data: {
    employee_id: string;
    month: number;
    year: number;
    base_salary: number;
    bonus?: number;
    deductions?: number;
    notes?: string;
  }
): Promise<ISalary> {
  const employee = await findEmployeeById(data.employee_id);
  if (!employee) throw new AppError('Employee not found', 404);

  const existing = await findSalaryByEmployeeAndPeriod(data.employee_id, data.month, data.year);
  if (existing) {
    throw new AppError(
      `Salary entry already exists for this employee for ${data.month}/${data.year}`,
      409
    );
  }

  const bonus = data.bonus ?? 0;
  const deductions = data.deductions ?? 0;
  const net_salary = calcNetSalary(data.base_salary, bonus, deductions);

  const salary = await createSalary({
    employee_id: toObjectId(data.employee_id),
    month: data.month,
    year: data.year,
    base_salary: data.base_salary,
    bonus,
    deductions,
    net_salary,
    status: 'pending',
    notes: data.notes,
  } as Partial<ISalary>);

  return (await findSalaryById(salary._id))!;
}

export async function updateSalaryEntry(
  id: string,
  data: {
    base_salary?: number;
    bonus?: number;
    deductions?: number;
    notes?: string;
  }
): Promise<ISalary> {
  const existing = await findSalaryById(id);
  if (!existing) throw new AppError('Salary record not found', 404);
  if (existing.status === 'paid') throw new AppError('Cannot modify a paid salary entry', 422);

  const base = data.base_salary ?? existing.base_salary;
  const bonus = data.bonus ?? existing.bonus;
  const deductions = data.deductions ?? existing.deductions;
  const net_salary = calcNetSalary(base, bonus, deductions);

  const updated = await updateSalaryById(id, omitUndefined({ ...data, net_salary }));
  if (!updated) throw new AppError('Salary record not found', 404);
  return updated;
}

export async function markSalaryPaid(
  id: string,
  data: { payment_mode: SalaryPaymentMode; payment_date: Date; notes?: string },
  user: JwtPayload
): Promise<ISalary> {
  const existing = await findSalaryById(id);
  if (!existing) throw new AppError('Salary record not found', 404);
  if (existing.status === 'paid') throw new AppError('Salary is already marked as paid', 422);

  const updated = await updateSalaryById(id, {
    status: 'paid',
    payment_mode: data.payment_mode,
    payment_date: data.payment_date,
    paid_by: toObjectId(user.userId),
    ...(data.notes ? { notes: data.notes } : {}),
  });
  if (!updated) throw new AppError('Salary record not found', 404);

  const { closePendingRemindersForRecord } = await import('./reminder.service.js');
  void closePendingRemindersForRecord('salary', toObjectId(id)).catch(() => undefined);

  return updated;
}

export async function removeSalary(id: string): Promise<void> {
  const existing = await findSalaryById(id);
  if (!existing) throw new AppError('Salary record not found', 404);
  if (existing.status === 'paid') throw new AppError('Cannot delete a paid salary entry', 422);
  await deleteSalaryById(id);
  const { closePendingRemindersForRecord } = await import('./reminder.service.js');
  void closePendingRemindersForRecord('salary', toObjectId(id)).catch(() => undefined);
}
