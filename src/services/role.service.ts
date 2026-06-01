import {
  findAllRoles,
  findRoleById,
  createRole,
  updateRoleById,
  updateRolePermissions,
  deleteRoleById,
  roleExistsByName,
} from '../repositories/role.repository.js';
import { findUsersByRoleId } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { DEFAULT_ROLE_PERMISSIONS, MODULES } from '../constants/permissions.js';
import type { IRole } from '../types/index.js';
import type { RolePermissions } from '../constants/permissions.js';

export async function listRoles(): Promise<IRole[]> {
  return findAllRoles();
}

export async function getRoleById(id: string): Promise<IRole> {
  const role = await findRoleById(id);
  if (!role) throw new AppError('Role not found', 404);
  return role;
}

export async function createNewRole(data: {
  name: string;
  description?: string;
  permissions?: RolePermissions;
}): Promise<IRole> {
  const exists = await roleExistsByName(data.name);
  if (exists) throw new AppError('Role name already exists', 409);

  // Use provided permissions → fallback to defaults for known names → empty
  const permissions = data.permissions
    ? sanitizePermissions(data.permissions)
    : (DEFAULT_ROLE_PERMISSIONS[data.name] ?? {}) as RolePermissions;

  return createRole({
    name: data.name,
    description: data.description ?? '',
    is_system: false,
    permissions,
  });
}

export async function updateRole(
  id: string,
  data: { name?: string; description?: string }
): Promise<IRole> {
  const role = await findRoleById(id);
  if (!role) throw new AppError('Role not found', 404);

  if (role.is_system && data.name) {
    throw new AppError('Cannot rename a system role', 403);
  }

  if (data.name) {
    const taken = await roleExistsByName(data.name, id);
    if (taken) throw new AppError('Role name already exists', 409);
  }

  const updated = await updateRoleById(id, data);
  if (!updated) throw new AppError('Role not found', 404);
  return updated;
}

export async function setRolePermissions(id: string, permissions: RolePermissions): Promise<IRole> {
  const role = await findRoleById(id);
  if (!role) throw new AppError('Role not found', 404);

  const validated = sanitizePermissions(permissions);
  const updated = await updateRolePermissions(id, validated);
  if (!updated) throw new AppError('Role not found', 404);
  return updated;
}

export async function removeRole(id: string): Promise<void> {
  const role = await findRoleById(id);
  if (!role) throw new AppError('Role not found', 404);

  if (role.is_system) throw new AppError('System roles cannot be deleted', 403);

  const usersWithRole = await findUsersByRoleId(id);
  if (usersWithRole.length > 0) {
    throw new AppError('Cannot delete role with assigned users. Reassign users first.', 409);
  }

  await deleteRoleById(id);
}

export async function getUsersInRole(roleId: string) {
  const role = await findRoleById(roleId);
  if (!role) throw new AppError('Role not found', 404);
  return findUsersByRoleId(roleId);
}

function sanitizePermissions(input: RolePermissions): RolePermissions {
  const result: RolePermissions = {};
  for (const mod of MODULES) {
    const perm = input[mod];
    if (!perm) continue;
    result[mod] = {
      read: Boolean(perm.read),
      create: Boolean(perm.create),
      update: Boolean(perm.update),
      delete: Boolean(perm.delete),
    };
  }
  return result;
}
