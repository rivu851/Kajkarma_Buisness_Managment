import { z } from 'zod';
import { REIMBURSEMENT_STATUSES, REIMBURSEMENT_CATEGORIES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listReimbursementsSchema = z.object({
  query: listQuerySchema.extend({
    employee_id: objectIdSchema.optional(),
    status: z.enum(REIMBURSEMENT_STATUSES).optional(),
    category: z.enum(REIMBURSEMENT_CATEGORIES).optional(),
    project_id: objectIdSchema.optional(),
    client_id: objectIdSchema.optional(),
  }),
});

export const createReimbursementSchema = z.object({
  body: z.object({
    employee_id: objectIdSchema,
    expense_title: z.string().min(1).max(300),
    amount: z.number().positive(),
    expense_date: z.coerce.date(),
    reason: z.string().min(1),
    category: z.enum(REIMBURSEMENT_CATEGORIES),
    project_id: objectIdSchema.optional(),
    client_id: objectIdSchema.optional(),
    bill_attachment_url: z.string().url().optional(),
    notes: z.string().optional(),
  }),
});

export const updateReimbursementSchema = z.object({
  params: idParamSchema,
  body: z.object({
    expense_title: z.string().min(1).max(300).optional(),
    amount: z.number().positive().optional(),
    expense_date: z.coerce.date().optional(),
    reason: z.string().min(1).optional(),
    category: z.enum(REIMBURSEMENT_CATEGORIES).optional(),
    bill_attachment_url: z.string().url().optional(),
    notes: z.string().optional(),
  }),
});

export const reviewReimbursementSchema = z.object({
  params: idParamSchema,
  body: z.object({
    notes: z.string().optional(),
  }),
});

export const markPaidReimbursementSchema = z.object({
  params: idParamSchema,
  body: z.object({
    paid_date: z.coerce.date(),
    notes: z.string().optional(),
  }),
});
