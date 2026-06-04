import type { Types } from 'mongoose';

export interface IDailyDigestLog {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  digest_date: string;
  sent_at: Date;
}
