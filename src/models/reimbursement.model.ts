import { Schema, model } from 'mongoose';
import { REIMBURSEMENT_STATUSES, REIMBURSEMENT_CATEGORIES } from '../constants/enums.js';
import type { IReimbursement } from '../types/business.js';

const reimbursementSchema = new Schema<IReimbursement>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    expense_title: { type: String, required: true, trim: true, maxlength: 300 },
    amount: { type: Number, required: true, min: 0.01 },
    expense_date: { type: Date, required: true },
    reason: { type: String, required: true },
    category: { type: String, enum: REIMBURSEMENT_CATEGORIES, required: true },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client' },
    bill_attachment_url: { type: String },
    status: { type: String, enum: REIMBURSEMENT_STATUSES, default: 'submitted' },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    approval_date: { type: Date },
    paid_date: { type: Date },
    notes: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

reimbursementSchema.index({ employee_id: 1, status: 1 });
reimbursementSchema.index({ status: 1, created_at: -1 });
reimbursementSchema.index({ project_id: 1 });
reimbursementSchema.index({ client_id: 1 });

export const Reimbursement = model<IReimbursement>('Reimbursement', reimbursementSchema);
