import { Schema, model } from 'mongoose';
import { EMPLOYEE_STATUSES } from '../constants/enums.js';
import type { IEmployee } from '../types/business.js';

const employeeSchema = new Schema<IEmployee>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, unique: true },
    full_name: { type: String, required: true, trim: true },
    date_of_birth: { type: Date },
    phone_number: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    department: { type: String, required: true, trim: true },
    role_designation: { type: String, required: true, trim: true },
    joining_date: { type: Date, required: true },
    salary: { type: Number, min: 0 },
    salary_day: { type: Number, min: 1, max: 28 },
    pending_salary: { type: Number, default: 0, min: 0 },
    bank_account_holder: { type: String },
    bank_name: { type: String },
    account_number: { type: String },
    ifsc_code: { type: String },
    branch_name: { type: String },
    upi_id: { type: String },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'active' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

employeeSchema.index({ status: 1, department: 1 });

export const Employee = model<IEmployee>('Employee', employeeSchema);
