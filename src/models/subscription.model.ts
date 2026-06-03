import { Schema, model } from 'mongoose';
import { SUBSCRIPTION_STATUSES, BILLING_CYCLES } from '../constants/enums.js';
import type { ISubscription } from '../types/business.js';

const subscriptionSchema = new Schema<ISubscription>(
  {
    plan_name: { type: String, required: true, trim: true, maxlength: 200 },
    provider: { type: String, required: true, trim: true, maxlength: 200 },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    renewal_date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    billing_cycle: { type: String, enum: BILLING_CYCLES, required: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, default: 'active' },
    assigned_to: { type: String },
    notes: { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ renewal_date: 1 });
subscriptionSchema.index({ end_date: 1 });

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
