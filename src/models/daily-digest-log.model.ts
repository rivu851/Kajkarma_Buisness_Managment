import { Schema, model } from 'mongoose';
import type { IDailyDigestLog } from '../types/daily-digest-log.js';

const dailyDigestLogSchema = new Schema<IDailyDigestLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    digest_date: { type: String, required: true, trim: true },
    sent_at: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: 'daily_digest_logs',
  }
);

dailyDigestLogSchema.index({ user_id: 1, digest_date: 1 }, { unique: true });

export const DailyDigestLog = model<IDailyDigestLog>('DailyDigestLog', dailyDigestLogSchema);
