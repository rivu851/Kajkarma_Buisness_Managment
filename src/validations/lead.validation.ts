import { z } from 'zod';
import { LEAD_STAGES, LEAD_STATUSES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listLeadsSchema = z.object({
  query: listQuerySchema.extend({
    stage: z.enum(LEAD_STAGES).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    assigned_user_id: objectIdSchema.optional(),
    source: z.string().optional(),
  }),
});

export const createLeadSchema = z.object({
  body: z.object({
    lead_name: z.string().min(1, 'Lead name is required'),
    phone_number: z.string().optional(),
    email: z.email().optional().or(z.literal('')),
    company_name: z.string().optional(),
    sector: z.string().optional(),
    source: z.string().min(1, 'Source is required'),
    stage: z.enum(LEAD_STAGES).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    follow_up_date: z.coerce.date().optional(),
    assigned_user_id: objectIdSchema.optional(),
  }),
});

export const updateLeadSchema = z.object({
  params: idParamSchema,
  body: z.object({
    lead_name: z.string().min(1).optional(),
    phone_number: z.string().optional(),
    email: z.email().optional().or(z.literal('')),
    company_name: z.string().optional(),
    sector: z.string().optional(),
    source: z.string().optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    follow_up_date: z.coerce.date().nullable().optional(),
  }),
});

export const updateLeadStageSchema = z.object({
  params: idParamSchema,
  body: z.object({
    stage: z.enum(LEAD_STAGES),
    note: z.string().optional(),
  }),
});

export const assignLeadSchema = z.object({
  params: idParamSchema,
  body: z.object({
    assigned_user_id: objectIdSchema,
  }),
});

export const addLeadNoteSchema = z.object({
  params: idParamSchema,
  body: z.object({
    note: z.string().min(1, 'Note is required'),
  }),
});
