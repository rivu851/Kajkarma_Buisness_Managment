import { Router } from 'express';
import {
  getSalaries,
  getSalary,
  createSalaryHandler,
  updateSalaryHandler,
  markPaid,
  deleteSalary,
} from '../controllers/salary.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listSalariesSchema,
  createSalarySchema,
  updateSalarySchema,
  markPaidSchema,
} from '../validations/salary.validation.js';
import { idParamSchema } from '../validations/common.validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('salary', 'read'), validate(listSalariesSchema), getSalaries);
router.post('/', requirePermission('salary', 'create'), validate(createSalarySchema), createSalaryHandler);
router.get('/:id', requirePermission('salary', 'read'), validate(z.object({ params: idParamSchema })), getSalary);
router.patch('/:id', requirePermission('salary', 'update'), validate(updateSalarySchema), updateSalaryHandler);
router.patch('/:id/pay', requirePermission('salary', 'update'), validate(markPaidSchema), markPaid);
router.delete('/:id', requirePermission('salary', 'delete'), validate(z.object({ params: idParamSchema })), deleteSalary);

export default router;
