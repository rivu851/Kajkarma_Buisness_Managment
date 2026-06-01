import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUserHandler,
  deleteUser,
  updateStatus,
  assignRole,
  getUserPermissionsHandler,
  getAccessControlHandler,
  setAccessControlHandler,
} from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  assignRoleSchema,
  listUsersSchema,
  updateAccessControlSchema,
} from '../validations/user.validation.js';
import { SYSTEM_ROLES } from '../constants/roles.js';

const router = Router();

router.use(authenticate);

const adminOrAbove = requireRole(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN);

router.get('/', adminOrAbove, validate(listUsersSchema), getUsers);
router.post('/', adminOrAbove, validate(createUserSchema), createUser);
router.get('/:id', adminOrAbove, getUser);
router.patch('/:id', adminOrAbove, validate(updateUserSchema), updateUserHandler);
router.delete('/:id', requireRole(SYSTEM_ROLES.SUPER_ADMIN), deleteUser);
router.patch('/:id/status', adminOrAbove, validate(updateUserStatusSchema), updateStatus);
router.patch('/:id/role', adminOrAbove, validate(assignRoleSchema), assignRole);
router.get('/:id/permissions', adminOrAbove, getUserPermissionsHandler);
router.get('/:id/access-control', requireRole(SYSTEM_ROLES.SUPER_ADMIN), getAccessControlHandler);
router.patch('/:id/access-control', requireRole(SYSTEM_ROLES.SUPER_ADMIN), validate(updateAccessControlSchema), setAccessControlHandler);

export default router;
