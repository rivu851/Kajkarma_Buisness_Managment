import { Router } from 'express';
import {
  getEmployees,
  getEmployee,
  getMyEmployee,
  createEmployee,
  updateEmployeeHandler,
  deleteEmployee,
} from '../controllers/employee.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listEmployeesSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
} from '../validations/employee.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('employees', 'read'), validate(listEmployeesSchema), getEmployees);
router.post('/', requirePermission('employees', 'create'), validate(createEmployeeSchema), createEmployee);
router.get('/me', getMyEmployee);
router.get('/:id', requirePermission('employees', 'read'), getEmployee);
router.patch(
  '/:id',
  requirePermission('employees', 'update'),
  validate(updateEmployeeSchema),
  updateEmployeeHandler
);
router.delete('/:id', requirePermission('employees', 'delete'), deleteEmployee);

export default router;
