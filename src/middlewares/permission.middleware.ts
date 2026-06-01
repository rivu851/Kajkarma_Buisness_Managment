import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { sendError } from '../utils/response.js';
import { findRoleById } from '../repositories/role.repository.js';
import { findAccessControl } from '../repositories/user.repository.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { Module, Action, ModulePermission } from '../constants/permissions.js';

export function requirePermission(module: Module, action: Action): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    // Super admin bypasses all permission checks
    if (user.roleName === SYSTEM_ROLES.SUPER_ADMIN) {
      next();
      return;
    }

    try {
      const [role, accessControl] = await Promise.all([
        findRoleById(user.roleId),
        findAccessControl(user.userId),
      ]);

      if (!role) {
        sendError(res, 'Role not found', 403);
        return;
      }

      // Check access control overrides first, then fall back to role permissions
      const permissions = role.permissions as unknown as Record<string, ModulePermission>;
      const overrides = accessControl?.module_permissions as unknown as Record<string, ModulePermission> | undefined;

      const effective: ModulePermission | undefined = overrides?.[module] ?? permissions[module];

      if (!effective || !effective[action]) {
        sendError(res, `Access denied: insufficient permission for ${module}:${action}`, 403);
        return;
      }

      next();
    } catch {
      sendError(res, 'Permission check failed', 500);
    }
  };
}

export function requireRole(...roleNames: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }
    if (!roleNames.includes(user.roleName)) {
      sendError(res, 'Access denied: role not permitted', 403);
      return;
    }
    next();
  };
}
