import { Schema, model } from 'mongoose';
import type { IAttendance } from '../types/business.js';

const attendanceSessionSchema = new Schema(
  {
    check_in: { type: Date, required: true },
    check_out: { type: Date, default: null },
    duration_minutes: { type: Number, default: null },
  },
  { _id: true, versionKey: false }
);

const attendanceSchema = new Schema<IAttendance>(
  {
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    sessions: { type: [attendanceSessionSchema], default: [] },
    total_minutes: { type: Number, default: 0 },
    is_checked_in: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// One doc per employee per day
attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });
attendanceSchema.index({ employee_id: 1, date: -1 });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);
