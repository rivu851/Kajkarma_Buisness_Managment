import { Schema, model } from 'mongoose';
import { UPCOMING_PAYMENT_TYPES, UPCOMING_PAYMENT_STATUSES } from '../constants/enums.js';
import type { IUpcomingPayment } from '../types/business.js';

const upcomingPaymentSchema = new Schema<IUpcomingPayment>(
  {
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
    revenue_id: { type: Schema.Types.ObjectId, ref: 'Revenue' },
    amount: { type: Number, required: true, min: 0.01 },
    due_date: { type: Date, required: true },
    payment_type: { type: String, enum: UPCOMING_PAYMENT_TYPES, required: true },
    payment_status: { type: String, enum: UPCOMING_PAYMENT_STATUSES, default: 'pending' },
    reminder_date: { type: Date },
    assigned_follow_up_user: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

upcomingPaymentSchema.index({ client_id: 1, due_date: 1 });
upcomingPaymentSchema.index({ payment_status: 1, due_date: 1 });
upcomingPaymentSchema.index({ assigned_follow_up_user: 1 });
upcomingPaymentSchema.index({ revenue_id: 1 });

export const UpcomingPayment = model<IUpcomingPayment>('UpcomingPayment', upcomingPaymentSchema);
