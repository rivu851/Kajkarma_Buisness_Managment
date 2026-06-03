import { Schema, model } from 'mongoose';
import { REVENUE_TYPES, REVENUE_STATUSES } from '../constants/enums.js';
import type { IRevenue } from '../types/business.js';

const revenueSchema = new Schema<IRevenue>(
  {
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    received_amount: { type: Number, default: 0, min: 0 },
    due_date: { type: Date },
    revenue_date: { type: Date, required: true },
    type: { type: String, enum: REVENUE_TYPES, required: true },
    status: { type: String, enum: REVENUE_STATUSES, default: 'pending' },
    notes: { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

revenueSchema.index({ client_id: 1, status: 1 });
revenueSchema.index({ project_id: 1 });
revenueSchema.index({ due_date: 1 });

export const Revenue = model<IRevenue>('Revenue', revenueSchema);
