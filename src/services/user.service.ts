import {
  findAllUsers,
  findUserById,
  createUser,
  updateUserById,
  updateUserStatus,
  updateUserRole,
  deleteUserById,
  userExistsByEmail,
  findUsersByRoleId,
  findAccessControl,
  upsertAccessControl,
} from '../repositories/user.repository.js';
import { findRoleById } from '../repositories/role.repository.js';
import { AppError } from '../utils/AppError.js';
import { ROLE_HIERARCHY } from '../constants/roles.js';
import type { IUser, IAccessControl, UserStatus, PaginatedResult, JwtPayload } from '../types/index.js';
import type { IRole } from '../types/index.js';
import type { SystemRole } from '../constants/roles.js';
import type { RolePermissions } from '../constants/permissions.js';

export async function listUsers(
  page: number,
  limit: number,
  search?: string
): Promise<PaginatedResult<IUser>> {
  return findAllUsers(page, limit, search);
}

export async function getUserById(id: string): Promise<IUser> {
  const user = await findUserById(id);
  if (!user) throw new AppError('User not found', 404);
  return user;
}

export async function createNewUser(
  data: { name: string; email: string; password: string; role_id: string; source?: string },
  requester: JwtPayload
): Promise<IUser> {
  const emailTaken = await userExistsByEmail(data.email);
  if (emailTaken) throw new AppError('Email already in use', 409);

  const role = await findRoleById(data.role_id);
  if (!role) throw new AppError('Role not found', 404);

  await assertCanAssignRole(role, requester);

  return createUser({
    name: data.name,
    email: data.email,
    password: data.password,
    role_id: role._id,
    source: data.source ?? 'manual',
  });
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; source?: string },
  _requester: JwtPayload
): Promise<IUser> {
  const user = await findUserById(id);
  if (!user) throw new AppError('User not found', 404);

  if (data.email && data.email !== user.email) {
    const taken = await userExistsByEmail(data.email, id);
    if (taken) throw new AppError('Email already in use', 409);
  }

  const updated = await updateUserById(id, data);
  if (!updated) throw new AppError('User not found', 404);
  return updated;
}

export async function changeUserStatus(
  id: string,
  status: UserStatus,
  requester: JwtPayload
): Promise<IUser> {
  if (id === requester.userId) throw new AppError('Cannot change your own status', 400);

  const user = await findUserById(id);
  if (!user) throw new AppError('User not found', 404);

  const updated = await updateUserStatus(id, status);
  if (!updated) throw new AppError('User not found', 404);
  return updated;
}

export async function assignUserRole(
  userId: string,
  roleId: string,
  requester: JwtPayload
): Promise<IUser> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const role = await findRoleById(roleId);
  if (!role) throw new AppError('Role not found', 404);

  await assertCanAssignRole(role, requester);

  const updated = await updateUserRole(userId, roleId);
  if (!updated) throw new AppError('User not found', 404);
  return updated;
}

export async function getUserPermissions(userId: string): Promise<Record<string, unknown>> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('User not found', 404);
  const role = user.role_id as unknown as IRole;
  return { role: role.name, permissions: role.permissions };
}

export async function getUsersByRole(roleId: string): Promise<IUser[]> {
  const role = await findRoleById(roleId);
  if (!role) throw new AppError('Role not found', 404);
  return findUsersByRoleId(roleId);
}

export async function removeUser(id: string, requester: JwtPayload): Promise<void> {
  if (id === requester.userId) throw new AppError('Cannot delete your own account', 400);
  const deleted = await deleteUserById(id);
  if (!deleted) throw new AppError('User not found', 404);
}

export async function getAccessControl(userId: string): Promise<IAccessControl | null> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('User not found', 404);
  return findAccessControl(userId);
}

export async function setAccessControl(
  userId: string,
  data: { module_permissions?: RolePermissions }
): Promise<IAccessControl> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('User not found', 404);
  return upsertAccessControl(userId, data);
}

async function assertCanAssignRole(role: IRole, requester: JwtPayload): Promise<void> {
  const requesterLevel = ROLE_HIERARCHY[requester.roleName as SystemRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[role.name as SystemRole] ?? 0;
  if (targetLevel >= requesterLevel) {
    throw new AppError('Cannot assign a role equal to or higher than your own', 403);
  }
}
