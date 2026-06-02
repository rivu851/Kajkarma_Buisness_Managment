import { Schema, model } from 'mongoose';
import { CLIENT_STATUSES } from '../constants/enums.js';
import type { IClient } from '../types/business.js';

const clientSchema = new Schema<IClient>(
  {
    company_name: { type: String, required: true, trim: true },
    contact_person_name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone_number: { type: String, trim: true },
    website_link: { type: String, trim: true },
    social_media_links: { type: Schema.Types.Mixed, default: {} },
    sector: { type: String, trim: true },
    address: { type: String },
    status: { type: String, enum: CLIENT_STATUSES, default: 'active' },
    assigned_manager_id: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    source_lead_id: { type: Schema.Types.ObjectId, ref: 'Lead' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

clientSchema.index({ assigned_manager_id: 1, status: 1 });
clientSchema.index({ company_name: 'text', contact_person_name: 'text' });

export const Client = model<IClient>('Client', clientSchema);
