import { Router } from 'express';
import {
  getPayments,
  getPayment,
  createPayment,
  updatePaymentHandler,
  deletePayment,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listPaymentsSchema,
  createPaymentSchema,
  updatePaymentSchema,
} from '../validations/payment.validation.js';
import { idParamSchema } from '../validations/common.validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('payments', 'read'), validate(listPaymentsSchema), getPayments);
router.post('/', requirePermission('payments', 'create'), validate(createPaymentSchema), createPayment);
router.get('/:id', requirePermission('payments', 'read'), validate(z.object({ params: idParamSchema })), getPayment);
router.patch('/:id', requirePermission('payments', 'update'), validate(updatePaymentSchema), updatePaymentHandler);
router.delete('/:id', requirePermission('payments', 'delete'), validate(z.object({ params: idParamSchema })), deletePayment);

export default router;
