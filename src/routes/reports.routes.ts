import { Router } from 'express';
import {
  getReports,
  getReport,
  uploadReportHandler,
  updateReportHandler,
  deleteReportHandler,
} from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listReportsSchema,
  createReportSchema,
  updateReportSchema,
} from '../validations/report.validation.js';
import { idParamSchema } from '../validations/common.validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('reports', 'read'), validate(listReportsSchema), getReports);
router.post('/', requirePermission('reports', 'create'), validate(createReportSchema), uploadReportHandler);
router.get('/:id', requirePermission('reports', 'read'), validate(z.object({ params: idParamSchema })), getReport);
router.patch('/:id', requirePermission('reports', 'update'), validate(updateReportSchema), updateReportHandler);
router.delete('/:id', requirePermission('reports', 'delete'), validate(z.object({ params: idParamSchema })), deleteReportHandler);

export default router;
