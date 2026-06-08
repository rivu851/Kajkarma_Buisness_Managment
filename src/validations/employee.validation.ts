import { z } from 'zod';
import { EMPLOYEE_STATUSES } from '../constants/enums.js';
import { listQuerySchema, idParamSchema, objectIdSchema } from './common.validation.js';

const bankFieldsSchema = z.object({
  bank_account_holder: z.string().optional(),
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  ifsc_code: z.string().optional(),
  branch_name: z.string().optional(),
  upi_id: z.string().optional(),
});

export const listEmployeesSchema = z.object({
  query: listQuerySchema.extend({
    status: z.enum(EMPLOYEE_STATUSES).optional(),
    department: z.string().optional(),
  }),
});

const createUserAccountSchema = z.object({
  email: z.email('Invalid email for user account'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role_id: objectIdSchema,
});

export const createEmployeeSchema = z.object({
  body: z
    .object({
      user_id: objectIdSchema.optional(),
      full_name: z.string().min(1, 'Full name is required'),
      date_of_birth: z.coerce.date().optional(),
      phone_number: z.string().optional(),
      email: z.email().optional().or(z.literal('')),
      department: z.string().min(1, 'Department is required'),
      role_designation: z.string().min(1, 'Designation is required'),
      joining_date: z.coerce.date(),
      salary: z.number().min(0).optional(),
      salary_day: z.number().int().min(1).max(28).optional(),
      pending_salary: z.number().min(0).optional(),
      status: z.enum(EMPLOYEE_STATUSES).optional(),
      create_user_account: createUserAccountSchema.optional(),
    })
    .merge(bankFieldsSchema),
});

export const updateEmployeeSchema = z.object({
  params: idParamSchema,
  body: z
    .object({
      user_id: objectIdSchema.nullable().optional(),
      full_name: z.string().min(1).optional(),
      date_of_birth: z.coerce.date().nullable().optional(),
      phone_number: z.string().optional(),
      email: z.email().optional().or(z.literal('')),
      department: z.string().optional(),
      role_designation: z.string().optional(),
      joining_date: z.coerce.date().optional(),
      salary: z.number().min(0).nullable().optional(),
      salary_day: z.number().int().min(1).max(28).nullable().optional(),
      pending_salary: z.number().min(0).optional(),
      status: z.enum(EMPLOYEE_STATUSES).optional(),
    })
    .merge(bankFieldsSchema),
});
