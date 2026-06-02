import {
  findAllEmployees,
  findEmployeeById,
  findEmployeeByUserId,
  createEmployee,
  updateEmployeeById,
  deleteEmployeeById,
} from '../repositories/employee.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import {
  encryptField,
  decryptField,
  maskAccountNumber,
} from '../utils/encryption.js';
import { canViewSensitiveEmployeeData } from '../utils/recordScope.js';
import { toObjectId } from '../utils/recordScope.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import type { IEmployee } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

const SENSITIVE_FIELDS = [
  'salary',
  'pending_salary',
  'date_of_birth',
  'bank_account_holder',
  'bank_name',
  'account_number',
  'ifsc_code',
  'branch_name',
  'upi_id',
] as const;

const ENCRYPTED_FIELDS = ['account_number', 'ifsc_code', 'upi_id'] as const;

function encryptBankFields(data: Partial<IEmployee>): Partial<IEmployee> {
  const result: Partial<IEmployee> = { ...data };
  for (const field of ENCRYPTED_FIELDS) {
    const val = result[field];
    if (val && typeof val === 'string' && !val.includes(':')) {
      (result as Record<string, string>)[field] = encryptField(val);
    }
  }
  return result;
}

function formatEmployeeForUser(employee: IEmployee, user: JwtPayload): Record<string, unknown> {
  const canSensitive = canViewSensitiveEmployeeData(user);
  const isSelf =
    employee.user_id?.toString() === user.userId &&
    user.roleName !== 'finance';

  if (canSensitive || isSelf) {
    const formatted = { ...employee } as Record<string, unknown>;
    for (const field of ENCRYPTED_FIELDS) {
      const val = formatted[field];
      if (typeof val === 'string' && val.includes(':')) {
        formatted[field] = decryptField(val);
      }
    }
    return formatted;
  }

  const safe = { ...employee } as Record<string, unknown>;
  for (const field of SENSITIVE_FIELDS) {
    delete safe[field];
  }
  if (employee.account_number) {
    safe['account_number_masked'] = maskAccountNumber(employee.account_number);
  }
  return safe;
}

export async function listEmployees(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: { status?: string; department?: string; search?: string }
): Promise<PaginatedResult<Record<string, unknown>>> {
  const result = await findAllEmployees(page, limit, filters, filters.search);
  return {
    ...result,
    data: result.data.map((e) => formatEmployeeForUser(e, user)),
  };
}

export async function getEmployeeById(
  id: string,
  user: JwtPayload
): Promise<Record<string, unknown>> {
  const employee = await findEmployeeById(id);
  if (!employee) throw new AppError('Employee not found', 404);

  const isSelf = employee.user_id?.toString() === user.userId;
  if (!canViewSensitiveEmployeeData(user) && !isSelf) {
    const hasBasicAccess =
      user.roleName === 'admin' ||
      user.roleName === 'super_admin' ||
      user.roleName === 'project_manager';
    if (!hasBasicAccess) {
      throw new AppError('Access denied to this employee record', 403);
    }
  }

  return formatEmployeeForUser(employee, user);
}

export async function createNewEmployee(
  data: Partial<IEmployee>,
  user: JwtPayload
): Promise<Record<string, unknown>> {
  if (data.user_id) {
    const linkedUser = await findUserById(data.user_id.toString());
    if (!linkedUser) throw new AppError('Linked user not found', 404);
    const existing = await findEmployeeByUserId(data.user_id.toString());
    if (existing) throw new AppError('User already linked to an employee', 409);
  }

  const payload = encryptBankFields(
    omitUndefined({
      ...data,
      pending_salary: data.pending_salary ?? 0,
      ...(data.user_id ? { user_id: toObjectId(data.user_id.toString()) } : {}),
    }) as Partial<IEmployee>
  );

  const employee = await createEmployee(payload);
  const full = (await findEmployeeById(employee._id))!;
  return formatEmployeeForUser(full, user);
}

export async function updateEmployee(
  id: string,
  data: Partial<IEmployee>,
  user: JwtPayload
): Promise<Record<string, unknown>> {
  const existing = await findEmployeeById(id);
  if (!existing) throw new AppError('Employee not found', 404);

  const payload = encryptBankFields(data);
  const updated = await updateEmployeeById(id, payload);
  if (!updated) throw new AppError('Employee not found', 404);
  return formatEmployeeForUser(updated, user);
}

export async function removeEmployee(id: string): Promise<void> {
  const deleted = await deleteEmployeeById(id);
  if (!deleted) throw new AppError('Employee not found', 404);
}
