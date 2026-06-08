import { Schema, model } from 'mongoose';
import { WORK_STATUSES } from '../constants/enums.js';
import type { IWorklog } from '../types/business.js';

const worklogSchema = new Schema<IWorklog>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    task_title: { type: String, required: true, trim: true },
    task_description: { type: String },
    time_spent_hours: { type: Number, default: 0, min: 0 },
    work_status: { type: String, enum: WORK_STATUSES, default: 'in_progress' },
    remarks: { type: String },
    started_at: { type: Date, default: Date.now },
    completed_at: { type: Date, default: null },
    paused_duration_minutes: { type: Number, default: 0 },
    last_paused_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

worklogSchema.index({ employee_id: 1, date: -1 });
worklogSchema.index({ project_id: 1, date: -1 });

export const Worklog = model<IWorklog>('Worklog', worklogSchema);
