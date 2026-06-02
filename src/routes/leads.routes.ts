import { Router } from 'express';
import {
  getLeads,
  getLead,
  createLead,
  updateLeadHandler,
  deleteLead,
  updateLeadStage,
  assignLeadHandler,
  convertLead,
  addLeadNote,
} from '../controllers/lead.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listLeadsSchema,
  createLeadSchema,
  updateLeadSchema,
  updateLeadStageSchema,
  assignLeadSchema,
  addLeadNoteSchema,
} from '../validations/lead.validation.js';
import { z } from 'zod';
import { idParamSchema } from '../validations/common.validation.js';

const convertLeadSchema = z.object({ params: idParamSchema });

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('leads', 'read'), validate(listLeadsSchema), getLeads);
router.post('/', requirePermission('leads', 'create'), validate(createLeadSchema), createLead);
router.get('/:id', requirePermission('leads', 'read'), getLead);
router.patch('/:id', requirePermission('leads', 'update'), validate(updateLeadSchema), updateLeadHandler);
router.delete('/:id', requirePermission('leads', 'delete'), deleteLead);
router.patch(
  '/:id/stage',
  requirePermission('leads', 'update'),
  validate(updateLeadStageSchema),
  updateLeadStage
);
router.patch(
  '/:id/assign',
  requirePermission('leads', 'update'),
  validate(assignLeadSchema),
  assignLeadHandler
);
router.post('/:id/convert', requirePermission('leads', 'update'), validate(convertLeadSchema), convertLead);
router.post(
  '/:id/notes',
  requirePermission('leads', 'update'),
  validate(addLeadNoteSchema),
  addLeadNote
);

export default router;
