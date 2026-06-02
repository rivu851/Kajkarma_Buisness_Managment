import { Types } from 'mongoose';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { JwtPayload } from '../types/index.js';

const MANAGEMENT_ROLES = new Set<string>([
  SYSTEM_ROLES.SUPER_ADMIN,
  SYSTEM_ROLES.ADMIN,
  SYSTEM_ROLES.SALES_MANAGER,
  SYSTEM_ROLES.PROJECT_MANAGER,
  SYSTEM_ROLES.HR,
  SYSTEM_ROLES.FINANCE,
]);

export function hasFullRecordAccess(user: JwtPayload): boolean {
  return MANAGEMENT_ROLES.has(user.roleName);
}

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

export function leadListScope(user: JwtPayload): Record<string, unknown> {
  if (hasFullRecordAccess(user)) return {};
  if (user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE) {
    return { assigned_user_id: toObjectId(user.userId) };
  }
  return {};
}

export function clientListScope(user: JwtPayload): Record<string, unknown> {
  if (hasFullRecordAccess(user)) return {};
  if (user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE) {
    return { assigned_manager_id: toObjectId(user.userId) };
  }
  return {};
}

export function communicationListScope(user: JwtPayload): Record<string, unknown> {
  if (hasFullRecordAccess(user)) return {};
  if (user.roleName === SYSTEM_ROLES.SALES_EXECUTIVE) {
    return { user_id: toObjectId(user.userId) };
  }
  return {};
}

export function projectListScope(
  user: JwtPayload,
  employeeId?: Types.ObjectId | null
): Record<string, unknown> {
  if (hasFullRecordAccess(user)) return {};
  if (user.roleName === SYSTEM_ROLES.PROJECT_MANAGER) return {};
  if (employeeId) {
    return { assigned_employees: employeeId };
  }
  return { assigned_employees: toObjectId(user.userId) };
}

export function worklogListScope(
  user: JwtPayload,
  employeeId?: Types.ObjectId | null
): Record<string, unknown> {
  if (
    user.roleName === SYSTEM_ROLES.SUPER_ADMIN ||
    user.roleName === SYSTEM_ROLES.ADMIN ||
    user.roleName === SYSTEM_ROLES.PROJECT_MANAGER ||
    user.roleName === SYSTEM_ROLES.HR
  ) {
    return {};
  }
  if (employeeId) {
    return { employee_id: employeeId };
  }
  return { employee_id: toObjectId('000000000000000000000000') };
}

export function canViewSensitiveEmployeeData(user: JwtPayload): boolean {
  return (
    user.roleName === SYSTEM_ROLES.SUPER_ADMIN ||
    user.roleName === SYSTEM_ROLES.HR ||
    user.roleName === SYSTEM_ROLES.FINANCE
  );
}
