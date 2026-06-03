import { Router } from 'express';
import {
  getSubscriptions,
  getSubscription,
  createSubscriptionHandler,
  updateSubscriptionHandler,
  renewSubscriptionHandler,
  getExpiringSoonHandler,
  deleteSubscriptionHandler,
} from '../controllers/subscription.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listSubscriptionsSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
  renewSubscriptionSchema,
} from '../validations/subscription.validation.js';
import { idParamSchema } from '../validations/common.validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get('/expiring-soon', requirePermission('subscriptions', 'read'), getExpiringSoonHandler);
router.get('/', requirePermission('subscriptions', 'read'), validate(listSubscriptionsSchema), getSubscriptions);
router.post('/', requirePermission('subscriptions', 'create'), validate(createSubscriptionSchema), createSubscriptionHandler);
router.get('/:id', requirePermission('subscriptions', 'read'), validate(z.object({ params: idParamSchema })), getSubscription);
router.patch('/:id', requirePermission('subscriptions', 'update'), validate(updateSubscriptionSchema), updateSubscriptionHandler);
router.patch('/:id/renew', requirePermission('subscriptions', 'update'), validate(renewSubscriptionSchema), renewSubscriptionHandler);
router.delete('/:id', requirePermission('subscriptions', 'delete'), validate(z.object({ params: idParamSchema })), deleteSubscriptionHandler);

export default router;
