import { z } from 'zod';
import { COMMUNICATION_TYPES, ENTITY_TYPES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listCommunicationsSchema = z.object({
  query: listQuerySchema.extend({
    entity_type: z.enum(ENTITY_TYPES).optional(),
    entity_id: objectIdSchema.optional(),
    type: z.enum(COMMUNICATION_TYPES).optional(),
    user_id: objectIdSchema.optional(),
  }),
});

export const createCommunicationSchema = z.object({
  body: z.object({
    entity_type: z.enum(ENTITY_TYPES),
    entity_id: objectIdSchema,
    date: z.coerce.date().optional(),
    type: z.enum(COMMUNICATION_TYPES),
    notes: z.string().optional(),
    outcome: z.string().optional(),
    next_follow_up_date: z.coerce.date().optional(),
  }),
});

export const updateCommunicationSchema = z.object({
  params: idParamSchema,
  body: z.object({
    date: z.coerce.date().optional(),
    type: z.enum(COMMUNICATION_TYPES).optional(),
    notes: z.string().optional(),
    outcome: z.string().optional(),
    next_follow_up_date: z.coerce.date().nullable().optional(),
  }),
});
