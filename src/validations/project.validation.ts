import { z } from 'zod';
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  PAYMENT_STATUSES,
} from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listProjectsSchema = z.object({
  query: listQuerySchema.extend({
    status: z.enum(PROJECT_STATUSES).optional(),
    client_id: objectIdSchema.optional(),
    category: z.enum(PROJECT_CATEGORIES).optional(),
    priority: z.enum(PROJECT_PRIORITIES).optional(),
  }),
});

export const createProjectSchema = z.object({
  body: z.object({
    project_name: z.string().min(1, 'Project name is required'),
    client_id: objectIdSchema,
    category: z.enum(PROJECT_CATEGORIES),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    priority: z.enum(PROJECT_PRIORITIES).optional(),
    assigned_employees: z.array(objectIdSchema).optional(),
    payment_status: z.enum(PAYMENT_STATUSES).optional(),
    notes: z.string().optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: idParamSchema,
  body: z.object({
    project_name: z.string().min(1).optional(),
    category: z.enum(PROJECT_CATEGORIES).optional(),
    start_date: z.coerce.date().nullable().optional(),
    end_date: z.coerce.date().nullable().optional(),
    priority: z.enum(PROJECT_PRIORITIES).optional(),
    assigned_employees: z.array(objectIdSchema).optional(),
    payment_status: z.enum(PAYMENT_STATUSES).optional(),
    notes: z.string().optional(),
  }),
});

export const updateProjectStatusSchema = z.object({
  params: idParamSchema,
  body: z.object({
    status: z.enum(PROJECT_STATUSES),
  }),
});

export const assignProjectSchema = z.object({
  params: idParamSchema,
  body: z.object({
    assigned_employees: z.array(objectIdSchema).min(1, 'At least one employee required'),
  }),
});
