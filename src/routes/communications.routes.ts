import { Router } from 'express';
import {
  getCommunications,
  getCommunication,
  createCommunication,
  updateCommunicationHandler,
  deleteCommunication,
} from '../controllers/communication.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listCommunicationsSchema,
  createCommunicationSchema,
  updateCommunicationSchema,
} from '../validations/communication.validation.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('communications', 'read'),
  validate(listCommunicationsSchema),
  getCommunications
);
router.post(
  '/',
  requirePermission('communications', 'create'),
  validate(createCommunicationSchema),
  createCommunication
);
router.get('/:id', requirePermission('communications', 'read'), getCommunication);
router.patch(
  '/:id',
  requirePermission('communications', 'update'),
  validate(updateCommunicationSchema),
  updateCommunicationHandler
);
router.delete('/:id', requirePermission('communications', 'delete'), deleteCommunication);

export default router;
