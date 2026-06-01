import { z } from 'zod';
import { MODULES } from '../constants/permissions.js';

const modulePermissionSchema = z.object({
  read: z.boolean(),
  create: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role_id: z.string().min(1, 'Role is required'),
    source: z.string().optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.email().optional(),
    source: z.string().optional(),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['active', 'inactive', 'suspended']),
  }),
});

export const assignRoleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    role_id: z.string().min(1, 'Role ID is required'),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
  }),
});

export const updateAccessControlSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    module_permissions: z.record(z.string(), modulePermissionSchema).optional(),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type UpdateAccessControlInput = z.infer<typeof updateAccessControlSchema>['body'];
