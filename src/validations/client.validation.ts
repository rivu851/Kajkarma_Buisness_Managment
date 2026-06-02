import { z } from 'zod';
import { CLIENT_STATUSES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listClientsSchema = z.object({
  query: listQuerySchema.extend({
    status: z.enum(CLIENT_STATUSES).optional(),
    assigned_manager_id: objectIdSchema.optional(),
    sector: z.string().optional(),
  }),
});

export const createClientSchema = z.object({
  body: z.object({
    company_name: z.string().min(1, 'Company name is required'),
    contact_person_name: z.string().min(1, 'Contact person is required'),
    email: z.email().optional().or(z.literal('')),
    phone_number: z.string().optional(),
    website_link: z.string().url().optional().or(z.literal('')),
    social_media_links: z.record(z.string(), z.string()).optional(),
    sector: z.string().optional(),
    address: z.string().optional(),
    status: z.enum(CLIENT_STATUSES).optional(),
    assigned_manager_id: objectIdSchema.optional(),
    notes: z.string().optional(),
    source_lead_id: objectIdSchema.optional(),
  }),
});

export const updateClientSchema = z.object({
  params: idParamSchema,
  body: z.object({
    company_name: z.string().min(1).optional(),
    contact_person_name: z.string().min(1).optional(),
    email: z.email().optional().or(z.literal('')),
    phone_number: z.string().optional(),
    website_link: z.string().url().optional().or(z.literal('')),
    social_media_links: z.record(z.string(), z.string()).optional(),
    sector: z.string().optional(),
    address: z.string().optional(),
    status: z.enum(CLIENT_STATUSES).optional(),
    assigned_manager_id: objectIdSchema.optional(),
    notes: z.string().optional(),
  }),
});
