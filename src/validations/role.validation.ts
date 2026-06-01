import { z } from 'zod';
import { MODULES } from '../constants/permissions.js';

const modulePermissionSchema = z.object({
  read: z.boolean(),
  create: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Role name must be at least 2 characters')
      .regex(/^[a-z0-9_]+$/, 'Role name must be lowercase letters, numbers, or underscores'),
    description: z.string().optional(),
    permissions: z.record(z.enum(MODULES), modulePermissionSchema).optional(),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z
      .string()
      .min(2)
      .regex(/^[a-z0-9_]+$/)
      .optional(),
    description: z.string().optional(),
  }),
});

export const updatePermissionsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    permissions: z.record(z.string(), modulePermissionSchema),
  }),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>['body'];
