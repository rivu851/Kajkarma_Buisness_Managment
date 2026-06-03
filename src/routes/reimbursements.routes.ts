import { Router } from 'express';
import {
  getReimbursements,
  getReimbursement,
  submitReimbursementHandler,
  updateReimbursementHandler,
  approveReimbursement,
  rejectReimbursement,
  markPaidHandler,
  deleteReimbursementHandler,
} from '../controllers/reimbursement.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listReimbursementsSchema,
  createReimbursementSchema,
  updateReimbursementSchema,
  reviewReimbursementSchema,
  markPaidReimbursementSchema,
} from '../validations/reimbursement.validation.js';
import { idParamSchema } from '../validations/common.validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('reimbursements', 'read'), validate(listReimbursementsSchema), getReimbursements);
router.post('/', requirePermission('reimbursements', 'create'), validate(createReimbursementSchema), submitReimbursementHandler);
router.get('/:id', requirePermission('reimbursements', 'read'), validate(z.object({ params: idParamSchema })), getReimbursement);
router.patch('/:id', requirePermission('reimbursements', 'update'), validate(updateReimbursementSchema), updateReimbursementHandler);
router.patch('/:id/approve', requirePermission('reimbursements', 'update'), validate(reviewReimbursementSchema), approveReimbursement);
router.patch('/:id/reject', requirePermission('reimbursements', 'update'), validate(reviewReimbursementSchema), rejectReimbursement);
router.patch('/:id/pay', requirePermission('reimbursements', 'update'), validate(markPaidReimbursementSchema), markPaidHandler);
router.delete('/:id', requirePermission('reimbursements', 'delete'), validate(z.object({ params: idParamSchema })), deleteReimbursementHandler);

export default router;
