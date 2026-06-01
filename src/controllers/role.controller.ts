import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import {
  listRoles,
  getRoleById,
  createNewRole,
  updateRole,
  setRolePermissions,
  removeRole,
  getUsersInRole,
} from '../services/role.service.js';
import type { RolePermissions } from '../constants/permissions.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getRoles: RequestHandler = asyncHandler(async (_req, res: Response) => {
  const roles = await listRoles();
  sendSuccess(res, roles, 'Roles retrieved');
});

export const getRole: RequestHandler = asyncHandler(async (req, res: Response) => {
  const role = await getRoleById(param(req, 'id'));
  sendSuccess(res, role, 'Role retrieved');
});

export const createRole: RequestHandler = asyncHandler(async (req, res: Response) => {
  const role = await createNewRole(req.body as { name: string; description?: string; permissions?: RolePermissions });
  sendSuccess(res, role, 'Role created', 201);
});

export const updateRoleHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const role = await updateRole(param(req, 'id'), req.body as { name?: string; description?: string });
  sendSuccess(res, role, 'Role updated');
});

export const deleteRole: RequestHandler = asyncHandler(async (req, res: Response) => {
  await removeRole(param(req, 'id'));
  sendSuccess(res, null, 'Role deleted');
});

export const updatePermissions: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { permissions } = req.body as { permissions: RolePermissions };
  const role = await setRolePermissions(param(req, 'id'), permissions);
  sendSuccess(res, role, 'Permissions updated');
});

export const getRoleUsers: RequestHandler = asyncHandler(async (req, res: Response) => {
  const users = await getUsersInRole(param(req, 'id'));
  sendSuccess(res, users, 'Users retrieved');
});
