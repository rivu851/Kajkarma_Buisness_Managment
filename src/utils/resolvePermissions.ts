import { findRoleById } from '../repositories/role.repository.js';
import { findAccessControl } from '../repositories/user.repository.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import { DEFAULT_ROLE_PERMISSIONS, MODULES, type Module, type RolePermissions } from '../constants/permissions.js';
import type { JwtPayload } from '../types/index.js';

export async function resolveEffectivePermissions(user: JwtPayload): Promise<RolePermissions> {
  if (user.roleName === SYSTEM_ROLES.SUPER_ADMIN) {
    return DEFAULT_ROLE_PERMISSIONS.super_admin ?? Object.fromEntries(
      MODULES.map((m) => [m, { read: true, create: true, update: true, delete: true }])
    ) as RolePermissions;
  }

  const [role, accessControl] = await Promise.all([
    findRoleById(user.roleId),
    findAccessControl(user.userId),
  ]);

  const rolePerms = (role?.permissions ?? {}) as RolePermissions;
  const overrides = (accessControl?.module_permissions ?? {}) as RolePermissions;

  const merged: RolePermissions = { ...rolePerms };
  for (const [mod, perm] of Object.entries(overrides)) {
    if (perm) merged[mod as Module] = perm;
  }
  return merged;
}

export function canReadModule(permissions: RolePermissions, module: Module): boolean {
  if (permissions[module]?.read) return true;
  return false;
}

export function isTeamDashboardRole(roleName: string): boolean {
  return roleName === SYSTEM_ROLES.SALES_EXECUTIVE;
}

export function canViewSalaryMetrics(roleName: string): boolean {
  return (
    roleName === SYSTEM_ROLES.SUPER_ADMIN ||
    roleName === SYSTEM_ROLES.ADMIN ||
    roleName === SYSTEM_ROLES.HR ||
    roleName === SYSTEM_ROLES.FINANCE
  );
}
