import { User } from '../models/user.model.js';
import { AccessControl } from '../models/access_control.model.js';
import { LoginAudit } from '../models/login_audit.model.js';
import type { IUser, IAccessControl, ILoginAudit, UserStatus, PaginatedResult } from '../types/index.js';
import type { Types, Document } from 'mongoose';

export async function findAllUsers(
  page: number,
  limit: number,
  search?: string
): Promise<PaginatedResult<IUser>> {
  const query = search
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};

  const [data, total] = await Promise.all([
    User.find(query)
      .populate({ path: 'role_id', select: 'name description' })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })
      .lean(),
    User.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findUserById(id: string | Types.ObjectId): Promise<IUser | null> {
  return User.findById(id).populate({ path: 'role_id', select: 'name description permissions' }).lean();
}

export async function findUserByEmail(email: string): Promise<IUser | null> {
  return User.findOne({ email: email.toLowerCase() }).populate({ path: 'role_id', select: 'name description permissions' }).lean();
}

export async function findUserDocForAuth(email: string): Promise<(Document & IUser & { comparePassword(p: string): Promise<boolean> }) | null> {
  return User.findOne({ email: email.toLowerCase() }).select('+password') as unknown as Promise<(Document & IUser & { comparePassword(p: string): Promise<boolean> }) | null>;
}

export async function createUser(
  data: Pick<IUser, 'name' | 'email' | 'password' | 'role_id' | 'source'>
): Promise<IUser> {
  const user = new User(data);
  return (await user.save()).toObject();
}

export async function updateUserById(
  id: string | Types.ObjectId,
  data: Partial<Pick<IUser, 'name' | 'email' | 'role_id' | 'source'>>
): Promise<IUser | null> {
  return User.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate({ path: 'role_id', select: 'name description' })
    .lean();
}

export async function updateUserStatus(
  id: string | Types.ObjectId,
  status: UserStatus
): Promise<IUser | null> {
  return User.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
}

export async function updateUserRole(
  id: string | Types.ObjectId,
  roleId: string | Types.ObjectId
): Promise<IUser | null> {
  return User.findByIdAndUpdate(id, { $set: { role_id: roleId } }, { new: true })
    .populate({ path: 'role_id', select: 'name description' })
    .lean();
}

export async function removeUserRole(id: string | Types.ObjectId): Promise<IUser | null> {
  return User.findByIdAndUpdate(id, { $unset: { role_id: '' } }, { new: true }).lean();
}

export async function updateLastLogin(id: string | Types.ObjectId): Promise<void> {
  await User.findByIdAndUpdate(id, { $set: { last_login: new Date() } });
}

export async function deleteUserById(id: string | Types.ObjectId): Promise<IUser | null> {
  return User.findByIdAndDelete(id).lean();
}

export async function userExistsByEmail(email: string, excludeId?: string): Promise<boolean> {
  const query: Record<string, unknown> = { email: email.toLowerCase() };
  if (excludeId) query['_id'] = { $ne: excludeId };
  return (await User.countDocuments(query)) > 0;
}

export async function findUsersByRoleId(roleId: string | Types.ObjectId): Promise<IUser[]> {
  return User.find({ role_id: roleId }).lean();
}

export async function findAccessControl(userId: string | Types.ObjectId): Promise<IAccessControl | null> {
  return AccessControl.findOne({ user_id: userId }).lean();
}

export async function upsertAccessControl(
  userId: string | Types.ObjectId,
  data: Partial<Pick<IAccessControl, 'module_permissions' | 'custom_overrides'>>
): Promise<IAccessControl> {
  return AccessControl.findOneAndUpdate(
    { user_id: userId },
    { $set: { user_id: userId, ...data } },
    { new: true, upsert: true, runValidators: true }
  ).lean() as Promise<IAccessControl>;
}

export async function createLoginAudit(
  data: Pick<ILoginAudit, 'user_id' | 'ip_address' | 'user_agent' | 'status'>
): Promise<void> {
  await LoginAudit.create({ ...data, login_at: new Date() });
}
