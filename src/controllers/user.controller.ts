import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import {
  listUsers,
  getUserById,
  createNewUser,
  updateUser,
  changeUserStatus,
  assignUserRole,
  getUserPermissions,
  getUsersByRole,
  removeUser,
  getAccessControl,
  setAccessControl,
} from '../services/user.service.js';
import type { UserStatus } from '../types/index.js';
import type { RolePermissions } from '../constants/permissions.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getUsers: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as { page?: number; limit?: number; search?: string };
  const result = await listUsers(Number(q.page ?? 1), Number(q.limit ?? 20), q.search);
  sendSuccess(res, result, 'Users retrieved');
});

export const getUser: RequestHandler = asyncHandler(async (req, res: Response) => {
  const user = await getUserById(param(req, 'id'));
  sendSuccess(res, user, 'User retrieved');
});

export const createUser: RequestHandler = asyncHandler(async (req, res: Response) => {
  const user = await createNewUser(
    req.body as { name: string; email: string; password: string; role_id: string; source?: string },
    req.user!
  );
  sendSuccess(res, user, 'User created', 201);
});

export const updateUserHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const user = await updateUser(param(req, 'id'), req.body as { name?: string; email?: string }, req.user!);
  sendSuccess(res, user, 'User updated');
});

export const deleteUser: RequestHandler = asyncHandler(async (req, res: Response) => {
  await removeUser(param(req, 'id'), req.user!);
  sendSuccess(res, null, 'User deleted');
});

export const updateStatus: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { status } = req.body as { status: UserStatus };
  const user = await changeUserStatus(param(req, 'id'), status, req.user!);
  sendSuccess(res, user, 'User status updated');
});

export const assignRole: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { role_id } = req.body as { role_id: string };
  const user = await assignUserRole(param(req, 'id'), role_id, req.user!);
  sendSuccess(res, user, 'Role assigned');
});

export const getUserPermissionsHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const permissions = await getUserPermissions(param(req, 'id'));
  sendSuccess(res, permissions, 'Permissions retrieved');
});

export const getUsersForRole: RequestHandler = asyncHandler(async (req, res: Response) => {
  const users = await getUsersByRole(param(req, 'id'));
  sendSuccess(res, users, 'Users retrieved');
});

export const getAccessControlHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const ac = await getAccessControl(param(req, 'id'));
  sendSuccess(res, ac, 'Access control retrieved');
});

export const setAccessControlHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const body = req.body as { module_permissions?: RolePermissions };
  const data: { module_permissions?: RolePermissions } = {};
  if (body.module_permissions !== undefined) data.module_permissions = body.module_permissions;
  const ac = await setAccessControl(param(req, 'id'), data);
  sendSuccess(res, ac, 'Access control updated');
});
