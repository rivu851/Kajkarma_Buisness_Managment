import { z } from 'zod';
import { SUBSCRIPTION_STATUSES, BILLING_CYCLES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema } from './common.validation.js';

export const listSubscriptionsSchema = z.object({
  query: listQuerySchema.extend({
    status: z.enum(SUBSCRIPTION_STATUSES).optional(),
    billing_cycle: z.enum(BILLING_CYCLES).optional(),
    provider: z.string().optional(),
  }),
});

export const createSubscriptionSchema = z.object({
  body: z.object({
    plan_name: z.string().min(1).max(200),
    provider: z.string().min(1).max(200),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
    renewal_date: z.coerce.date(),
    amount: z.number().nonnegative(),
    billing_cycle: z.enum(BILLING_CYCLES),
    assigned_to: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateSubscriptionSchema = z.object({
  params: idParamSchema,
  body: z.object({
    plan_name: z.string().min(1).max(200).optional(),
    provider: z.string().min(1).max(200).optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    renewal_date: z.coerce.date().optional(),
    amount: z.number().nonnegative().optional(),
    billing_cycle: z.enum(BILLING_CYCLES).optional(),
    status: z.enum(SUBSCRIPTION_STATUSES).optional(),
    assigned_to: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const renewSubscriptionSchema = z.object({
  params: idParamSchema,
  body: z.object({
    end_date: z.coerce.date(),
    renewal_date: z.coerce.date(),
    amount: z.number().nonnegative().optional(),
  }),
});
