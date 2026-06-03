import { Router } from 'express';
import {
  getRevenues,
  getRevenue,
  createRevenueHandler,
  updateRevenueHandler,
  deleteRevenue,
} from '../controllers/revenue.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listRevenuesSchema,
  createRevenueSchema,
  updateRevenueSchema,
} from '../validations/revenue.validation.js';
import { idParamSchema } from '../validations/common.validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('revenue', 'read'), validate(listRevenuesSchema), getRevenues);
router.post('/', requirePermission('revenue', 'create'), validate(createRevenueSchema), createRevenueHandler);
router.get('/:id', requirePermission('revenue', 'read'), validate(z.object({ params: idParamSchema })), getRevenue);
router.patch('/:id', requirePermission('revenue', 'update'), validate(updateRevenueSchema), updateRevenueHandler);
router.delete('/:id', requirePermission('revenue', 'delete'), validate(z.object({ params: idParamSchema })), deleteRevenue);

export default router;
