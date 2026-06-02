import { Schema, model } from 'mongoose';
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  PAYMENT_STATUSES,
} from '../constants/enums.js';
import type { IProject, IProjectFile } from '../types/business.js';

const fileSchema = new Schema<IProjectFile>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploaded_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new Schema<IProject>(
  {
    project_name: { type: String, required: true, trim: true },
    client_id: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    category: { type: String, enum: PROJECT_CATEGORIES, required: true },
    start_date: { type: Date },
    end_date: { type: Date },
    status: { type: String, enum: PROJECT_STATUSES, default: 'not_started' },
    priority: { type: String, enum: PROJECT_PRIORITIES, default: 'medium' },
    assigned_employees: { type: [Schema.Types.ObjectId], ref: 'Employee', default: [] },
    payment_status: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    notes: { type: String },
    files: { type: [fileSchema], default: [] },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

projectSchema.index({ client_id: 1, status: 1 });
projectSchema.index({ assigned_employees: 1 });
projectSchema.index({ end_date: 1 });

export const Project = model<IProject>('Project', projectSchema);
