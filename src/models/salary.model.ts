import { Schema, model } from 'mongoose';
import { SALARY_STATUSES, SALARY_PAYMENT_MODES } from '../constants/enums.js';
import type { ISalary } from '../types/business.js';

const salarySchema = new Schema<ISalary>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000 },
    base_salary: { type: Number, required: true, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    net_salary: { type: Number, required: true, min: 0 },
    payment_mode: { type: String, enum: SALARY_PAYMENT_MODES },
    payment_date: { type: Date },
    status: { type: String, enum: SALARY_STATUSES, default: 'pending' },
    notes: { type: String },
    paid_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

salarySchema.index({ employee_id: 1, year: -1, month: -1 });
salarySchema.index({ year: 1, month: 1, status: 1 });
// Unique: one salary entry per employee per month/year
salarySchema.index({ employee_id: 1, month: 1, year: 1 }, { unique: true });

export const Salary = model<ISalary>('Salary', salarySchema);
