import { Schema, model } from 'mongoose';
import { PAYMENT_METHODS } from '../constants/enums.js';
import type { IPayment } from '../types/business.js';

const paymentSchema = new Schema<IPayment>(
  {
    revenue_id: { type: Schema.Types.ObjectId, ref: 'Revenue', required: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
    amount: { type: Number, required: true, min: 0.01 },
    payment_date: { type: Date, required: true },
    payment_method: { type: String, enum: PAYMENT_METHODS, required: true },
    reference_number: { type: String, trim: true },
    notes: { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

paymentSchema.index({ revenue_id: 1 });
paymentSchema.index({ client_id: 1, payment_date: -1 });

export const Payment = model<IPayment>('Payment', paymentSchema);
