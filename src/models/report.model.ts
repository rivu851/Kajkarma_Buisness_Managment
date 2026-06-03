import { Schema, model } from 'mongoose';
import { REPORT_TYPES } from '../constants/enums.js';
import type { IReport } from '../types/business.js';

const reportSchema = new Schema<IReport>(
  {
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
    report_title: { type: String, required: true, trim: true, maxlength: 300 },
    report_type: { type: String, enum: REPORT_TYPES, required: true },
    month: { type: Date, required: true },
    file_url: { type: String, required: true },
    uploaded_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

reportSchema.index({ client_id: 1, month: -1 });
reportSchema.index({ project_id: 1, month: -1 });
reportSchema.index({ uploaded_by: 1 });
reportSchema.index({ report_type: 1 });

export const Report = model<IReport>('Report', reportSchema);
