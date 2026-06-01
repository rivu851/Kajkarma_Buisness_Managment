import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import type { IUser } from '../types/index.js';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    source: { type: String, default: 'manual' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    last_login: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods['comparePassword'] = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password as string);
};

export const User = model<IUser>('User', userSchema);
