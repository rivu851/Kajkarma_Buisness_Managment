import { Schema, model } from 'mongoose';
import type { IAccessControl } from '../types/index.js';

const modulePermissionSchema = new Schema(
  {
    read: { 
      type: Boolean,
      default: false 
    },
    create: { 
      type: Boolean, 
      default: false 
    },
    update: { 
      type: Boolean, 
      default: false 
    },
    delete: { 
      type: Boolean, 
      default: false 
    },
  },
  { _id: false }
);

const accessControlSchema = new Schema<IAccessControl>(
  {
    user_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      unique: true 
    },
    module_permissions: { 
      type: Map, 
      of: modulePermissionSchema, 
      default: {} 
    },
    custom_overrides: {
      type: Schema.Types.Mixed, 
      default: {} 
    },
  },
  {
    timestamps: { 
      createdAt: 'created_at', 
      updatedAt: 'updated_at' 
    },
    versionKey: false,
  }
);

export const AccessControl = model<IAccessControl>('AccessControl', accessControlSchema);
