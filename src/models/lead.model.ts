import { Schema, model } from 'mongoose';
import { LEAD_STAGES, LEAD_STATUSES } from '../constants/enums.js';
import type { ILead, ILeadHistoryEntry } from '../types/business.js';

const historySchema = new Schema<ILeadHistoryEntry>(
  {
    action: { type: String, required: true },
    note: { type: String },
    changed_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changed_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leadSchema = new Schema<ILead>(
  {
    lead_name: { type: String, required: true, trim: true },
    phone_number: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    company_name: { type: String, trim: true },
    sector: { type: String, trim: true },
    source: { type: String, required: true, trim: true },
    stage: { type: String, enum: LEAD_STAGES, default: 'new' },
    status: { type: String, enum: LEAD_STATUSES, default: 'active' },
    tags: { type: [String], default: [] },
    notes: { type: String },
    follow_up_date: { type: Date },
    assigned_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    converted_at: { type: Date },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client' },
    history: { type: [historySchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

leadSchema.index({ assigned_user_id: 1, stage: 1, status: 1 });
leadSchema.index({ created_at: -1 });
leadSchema.index({ follow_up_date: 1 });

export const Lead = model<ILead>('Lead', leadSchema);
