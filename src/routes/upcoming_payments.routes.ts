import { Router } from 'express';
import {
  getUpcomingPayments,
  getUpcomingPayment,
  createUpcomingPaymentHandler,
  updateUpcomingPaymentHandler,
  markReceivedHandler,
  cancelPaymentHandler,
  deleteUpcomingPaymentHandler,
} from '../controllers/upcoming_payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listUpcomingPaymentsSchema,
  createUpcomingPaymentSchema,
  updateUpcomingPaymentSchema,
  markReceivedSchema,
  cancelPaymentSchema,
} from '../validations/upcoming_payment.validation.js';
import { idParamSchema } from '../validations/common.validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('payments', 'read'), validate(listUpcomingPaymentsSchema), getUpcomingPayments);
router.post('/', requirePermission('payments', 'create'), validate(createUpcomingPaymentSchema), createUpcomingPaymentHandler);
router.get('/:id', requirePermission('payments', 'read'), validate(z.object({ params: idParamSchema })), getUpcomingPayment);
router.patch('/:id', requirePermission('payments', 'update'), validate(updateUpcomingPaymentSchema), updateUpcomingPaymentHandler);
router.patch('/:id/receive', requirePermission('payments', 'update'), validate(markReceivedSchema), markReceivedHandler);
router.patch('/:id/cancel', requirePermission('payments', 'update'), validate(cancelPaymentSchema), cancelPaymentHandler);
router.delete('/:id', requirePermission('payments', 'delete'), validate(z.object({ params: idParamSchema })), deleteUpcomingPaymentHandler);

export default router;
