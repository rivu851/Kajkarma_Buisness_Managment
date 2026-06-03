import { z } from 'zod';
import { PAYMENT_METHODS } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listPaymentsSchema = z.object({
  query: listQuerySchema.extend({
    revenue_id: objectIdSchema.optional(),
    client_id: objectIdSchema.optional(),
    project_id: objectIdSchema.optional(),
    payment_method: z.enum(PAYMENT_METHODS).optional(),
  }),
});

export const createPaymentSchema = z.object({
  body: z.object({
    revenue_id: objectIdSchema,
    amount: z.number().positive('Amount must be positive'),
    payment_date: z.coerce.date(),
    payment_method: z.enum(PAYMENT_METHODS),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updatePaymentSchema = z.object({
  params: idParamSchema,
  body: z.object({
    amount: z.number().positive().optional(),
    payment_date: z.coerce.date().optional(),
    payment_method: z.enum(PAYMENT_METHODS).optional(),
    reference_number: z.string().optional(),
    notes: z.string().optional(),
  }),
});
