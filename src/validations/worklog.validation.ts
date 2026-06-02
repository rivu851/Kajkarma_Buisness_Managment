import { z } from 'zod';
import { WORK_STATUSES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listWorklogsSchema = z.object({
  query: listQuerySchema.extend({
    employee_id: objectIdSchema.optional(),
    project_id: objectIdSchema.optional(),
    work_status: z.enum(WORK_STATUSES).optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  }),
});

export const createWorklogSchema = z.object({
  body: z.object({
    employee_id: objectIdSchema.optional(),
    date: z.coerce.date(),
    project_id: objectIdSchema,
    task_title: z.string().min(1, 'Task title is required'),
    task_description: z.string().optional(),
    time_spent_hours: z.number().min(0),
    work_status: z.enum(WORK_STATUSES).optional(),
    remarks: z.string().optional(),
  }),
});

export const updateWorklogSchema = z.object({
  params: idParamSchema,
  body: z.object({
    date: z.coerce.date().optional(),
    project_id: objectIdSchema.optional(),
    task_title: z.string().min(1).optional(),
    task_description: z.string().optional(),
    time_spent_hours: z.number().min(0).optional(),
    work_status: z.enum(WORK_STATUSES).optional(),
    remarks: z.string().optional(),
  }),
});
