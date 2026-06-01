import type { Types } from 'mongoose';
import type { RolePermissions } from '../constants/permissions.js';

export type UserStatus = 'active' | 'inactive' | 'suspended';
export type LoginStatus = 'success' | 'failed';

export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IRole {
  _id: Types.ObjectId;
  name: string;
  description: string;
  is_system: boolean;
  permissions: RolePermissions;
  created_at: Date;
  updated_at: Date;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role_id: Types.ObjectId;
  source: string;
  status: UserStatus;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IAccessControl {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  module_permissions: RolePermissions;
  custom_overrides: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ILoginAudit {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  ip_address: string;
  user_agent: string;
  login_at: Date;
  status: LoginStatus;
  created_at: Date;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
