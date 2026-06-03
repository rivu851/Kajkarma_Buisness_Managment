import { z } from 'zod';
import { SALARY_STATUSES, SALARY_PAYMENT_MODES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listSalariesSchema = z.object({
  query: listQuerySchema.extend({
    employee_id: objectIdSchema.optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).optional(),
    status: z.enum(SALARY_STATUSES).optional(),
  }),
});

export const createSalarySchema = z.object({
  body: z.object({
    employee_id: objectIdSchema,
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000),
    base_salary: z.number().nonnegative(),
    bonus: z.number().nonnegative().optional(),
    deductions: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  }),
});

export const updateSalarySchema = z.object({
  params: idParamSchema,
  body: z.object({
    base_salary: z.number().nonnegative().optional(),
    bonus: z.number().nonnegative().optional(),
    deductions: z.number().nonnegative().optional(),
    notes: z.string().optional(),
  }),
});

export const markPaidSchema = z.object({
  params: idParamSchema,
  body: z.object({
    payment_mode: z.enum(SALARY_PAYMENT_MODES),
    payment_date: z.coerce.date(),
    notes: z.string().optional(),
  }),
});
