import type { Types } from 'mongoose';
import { findRoleByName } from '../repositories/role.repository.js';
import { findUsersByRoleId } from '../repositories/user.repository.js';
import { SYSTEM_ROLES } from '../constants/roles.js';

export async function getReimbursementApproverIds(): Promise<Types.ObjectId[]> {
  const ids: Types.ObjectId[] = [];
  for (const roleName of [SYSTEM_ROLES.HR, SYSTEM_ROLES.FINANCE]) {
    const role = await findRoleByName(roleName);
    if (!role) continue;
    const users = await findUsersByRoleId(role._id);
    for (const u of users) {
      ids.push(u._id as Types.ObjectId);
    }
  }
  return [...new Map(ids.map((id) => [id.toString(), id])).values()];
}

export async function getSuperAdminUserIds(): Promise<Types.ObjectId[]> {
  const role = await findRoleByName(SYSTEM_ROLES.SUPER_ADMIN);
  if (!role) return [];
  const users = await findUsersByRoleId(role._id);
  return users.map((u) => u._id as Types.ObjectId);
}
