import { z } from 'zod';
import { REPORT_TYPES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listReportsSchema = z.object({
  query: listQuerySchema.extend({
    client_id: objectIdSchema.optional(),
    project_id: objectIdSchema.optional(),
    report_type: z.enum(REPORT_TYPES).optional(),
    month: z.string().optional(),
  }),
});

export const createReportSchema = z.object({
  body: z.object({
    client_id: objectIdSchema,
    project_id: objectIdSchema.optional(),
    report_title: z.string().min(1).max(300),
    report_type: z.enum(REPORT_TYPES),
    month: z.coerce.date(),
    file_url: z.string().url(),
  }),
});

export const updateReportSchema = z.object({
  params: idParamSchema,
  body: z.object({
    report_title: z.string().min(1).max(300).optional(),
    report_type: z.enum(REPORT_TYPES).optional(),
    month: z.coerce.date().optional(),
    file_url: z.string().url().optional(),
  }),
});
