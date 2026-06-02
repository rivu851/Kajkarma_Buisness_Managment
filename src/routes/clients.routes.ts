import { Router } from 'express';
import {
  getClients,
  getClient,
  createClient,
  updateClientHandler,
  deleteClient,
} from '../controllers/client.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listClientsSchema,
  createClientSchema,
  updateClientSchema,
} from '../validations/client.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('clients', 'read'), validate(listClientsSchema), getClients);
router.post('/', requirePermission('clients', 'create'), validate(createClientSchema), createClient);
router.get('/:id', requirePermission('clients', 'read'), getClient);
router.patch(
  '/:id',
  requirePermission('clients', 'update'),
  validate(updateClientSchema),
  updateClientHandler
);
router.delete('/:id', requirePermission('clients', 'delete'), deleteClient);

export default router;
