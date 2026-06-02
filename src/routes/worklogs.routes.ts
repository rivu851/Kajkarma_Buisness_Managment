import { Router } from 'express';
import {
  getWorklogs,
  getWorklog,
  createWorklog,
  updateWorklogHandler,
  deleteWorklog,
} from '../controllers/worklog.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listWorklogsSchema,
  createWorklogSchema,
  updateWorklogSchema,
} from '../validations/worklog.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('worklogs', 'read'), validate(listWorklogsSchema), getWorklogs);
router.post('/', requirePermission('worklogs', 'create'), validate(createWorklogSchema), createWorklog);
router.get('/:id', requirePermission('worklogs', 'read'), getWorklog);
router.patch(
  '/:id',
  requirePermission('worklogs', 'update'),
  validate(updateWorklogSchema),
  updateWorklogHandler
);
router.delete('/:id', requirePermission('worklogs', 'delete'), deleteWorklog);

export default router;
