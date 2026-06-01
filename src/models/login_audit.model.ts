import { Schema, model } from 'mongoose';
import type { ILoginAudit } from '../types/index.js';

const loginAuditSchema = new Schema<ILoginAudit>(
  {
    user_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    ip_address: { 
      type: String, 
      default: 'unknown' 
    },
    user_agent: { 
      type: String, 
      default: 'unknown' 
    },
    login_at: { 
      type: Date, 
      default: Date.now 
    },
    status: { 
      type: String, 
      enum: ['success', 'failed'], 
      required: true 
    },
  },
  {
    timestamps: { createdAt: 'created_at' },
    versionKey: false,
  }
);

loginAuditSchema.index({ user_id: 1, login_at: -1 });

export const LoginAudit = model<ILoginAudit>('LoginAudit', loginAuditSchema);
