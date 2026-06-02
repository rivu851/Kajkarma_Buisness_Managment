import { Schema, model } from 'mongoose';
import { COMMUNICATION_TYPES, ENTITY_TYPES } from '../constants/enums.js';
import type { ICommunication } from '../types/business.js';

const communicationSchema = new Schema<ICommunication>(
  {
    entity_type: { type: String, enum: ENTITY_TYPES, required: true },
    entity_id: { type: Schema.Types.ObjectId, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, default: Date.now },
    type: { type: String, enum: COMMUNICATION_TYPES, required: true },
    notes: { type: String },
    outcome: { type: String, trim: true },
    next_follow_up_date: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

communicationSchema.index({ entity_type: 1, entity_id: 1, date: -1 });
communicationSchema.index({ user_id: 1, date: -1 });

export const Communication = model<ICommunication>('Communication', communicationSchema);
