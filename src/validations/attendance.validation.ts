import { z } from 'zod';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

export const listAttendanceSchema = z.object({
  query: listQuerySchema.extend({
    employee_id: objectIdSchema.optional(),
    date_from: z.coerce.date().optional(),
    date_to: z.coerce.date().optional(),
  }),
});

export const attendanceIdParamSchema = z.object({
  params: idParamSchema,
});
