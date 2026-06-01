import { Schema, model } from 'mongoose';
import type { IRole } from '../types/index.js';

const modulePermissionSchema = new Schema(
  {
    read: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    is_system: { type: Boolean, default: false },
    permissions: {
      type: Map,
      of: modulePermissionSchema,
      default: {},
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

export const Role = model<IRole>('Role', roleSchema);
