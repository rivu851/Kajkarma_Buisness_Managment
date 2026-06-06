import {
  findAllEmployees,
  findEmployeeById,
  findEmployeeByUserId,
  createEmployee,
  updateEmployeeById,
  deleteEmployeeById,
} from '../repositories/employee.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import { createNewUser } from './user.service.js';
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

export async function getMyEmployeeProfile(
  user: JwtPayload
): Promise<Record<string, unknown>> {
  const employee = await findEmployeeByUserId(user.userId);
  if (!employee) throw new AppError('No employee profile linked to your account', 404);
  return formatEmployeeForUser(employee, user);
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

type CreateUserAccount = { email: string; password: string; role_id: string };
type CreateEmployeeBody = Partial<IEmployee> & { create_user_account?: CreateUserAccount };

export async function createNewEmployee(
  data: CreateEmployeeBody,
  user: JwtPayload
): Promise<Record<string, unknown>> {
  const { create_user_account, ...employeeData } = data;

  if (create_user_account && employeeData.user_id) {
    throw new AppError('Cannot provide both user_id and create_user_account', 400);
  }

  if (create_user_account) {
    const newUser = await createNewUser(
      {
        name: employeeData.full_name ?? '',
        email: create_user_account.email,
        password: create_user_account.password,
        role_id: create_user_account.role_id,
        source: 'employee_onboarding',
      },
      user
    );
    employeeData.user_id = newUser._id;
  } else if (employeeData.user_id) {
    const linkedUser = await findUserById(employeeData.user_id.toString());
    if (!linkedUser) throw new AppError('Linked user not found', 404);
    const existing = await findEmployeeByUserId(employeeData.user_id.toString());
    if (existing) throw new AppError('User already linked to an employee', 409);
  }

  const payload = encryptBankFields(
    omitUndefined({
      ...employeeData,
      pending_salary: employeeData.pending_salary ?? 0,
      ...(employeeData.user_id ? { user_id: toObjectId(employeeData.user_id.toString()) } : {}),
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
