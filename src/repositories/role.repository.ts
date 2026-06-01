import { Role } from '../models/role.model.js';
import type { IRole } from '../types/index.js';
import type { RolePermissions } from '../constants/permissions.js';
import type { Types } from 'mongoose';

export async function findAllRoles(): Promise<IRole[]> {
  return Role.find().sort({ created_at: -1 }).lean();
}

export async function findRoleById(id: string | Types.ObjectId): Promise<IRole | null> {
  return Role.findById(id).lean();
}

export async function findRoleByName(name: string): Promise<IRole | null> {
  return Role.findOne({ name: name.toLowerCase() }).lean();
}

export async function createRole(
  data: Pick<IRole, 'name' | 'description' | 'is_system' | 'permissions'>
): Promise<IRole> {
  const role = new Role(data);
  return (await role.save()).toObject();
}

export async function updateRoleById(
  id: string | Types.ObjectId,
  data: Partial<Pick<IRole, 'name' | 'description' | 'permissions'>>
): Promise<IRole | null> {
  return Role.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).lean();
}

export async function updateRolePermissions(
  id: string | Types.ObjectId,
  permissions: RolePermissions
): Promise<IRole | null> {
  return Role.findByIdAndUpdate(id, { $set: { permissions } }, { new: true }).lean();
}

export async function deleteRoleById(id: string | Types.ObjectId): Promise<IRole | null> {
  return Role.findByIdAndDelete(id).lean();
}

export async function roleExistsByName(name: string, excludeId?: string): Promise<boolean> {
  const query: Record<string, unknown> = { name: name.toLowerCase() };
  if (excludeId) query['_id'] = { $ne: excludeId };
  const count = await Role.countDocuments(query);
  return count > 0;
}
