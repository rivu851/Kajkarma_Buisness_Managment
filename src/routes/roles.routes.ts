import { Router } from 'express';
import {
  getRoles,
  getRole,
  createRole,
  updateRoleHandler,
  deleteRole,
  updatePermissions,
  getRoleUsers,
} from '../controllers/role.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  createRoleSchema,
  updateRoleSchema,
  updatePermissionsSchema,
} from '../validations/role.validation.js';
import { SYSTEM_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

const superAdminOnly = requireRole(SYSTEM_ROLES.SUPER_ADMIN);
const adminOrAbove = requireRole(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN);

router.get('/', adminOrAbove, getRoles);
router.get('/:id', adminOrAbove, getRole);
router.post('/', superAdminOnly, validate(createRoleSchema), createRole);
router.patch('/:id', superAdminOnly, validate(updateRoleSchema), updateRoleHandler);
router.delete('/:id', superAdminOnly, deleteRole);
router.patch('/:id/permissions', superAdminOnly, validate(updatePermissionsSchema), updatePermissions);
router.get('/:id/users', adminOrAbove, getRoleUsers);

export default router;
