import type { Types } from 'mongoose';
import type {
  ReminderModule,
  ReminderPriority,
  ReminderStatus,
  ReminderType,
} from '../constants/enums.js';

export interface IReminderAuditEntry {
  action: string;
  user_id: Types.ObjectId;
  timestamp: Date;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
}

export interface IReminder {
  _id: Types.ObjectId;
  type: ReminderType;
  title: string;
  description?: string;
  priority: ReminderPriority;
  related_module: ReminderModule;
  related_record_id?: Types.ObjectId;
  assigned_user_id: Types.ObjectId;
  reminder_date: Date;
  reminder_time?: string;
  status: ReminderStatus;
  is_read: boolean;
  snoozed_until?: Date;
  completed_at?: Date;
  completed_by?: Types.ObjectId;
  dedup_key?: string;
  audit_history: IReminderAuditEntry[];
  created_by: Types.ObjectId;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface INotification {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  reminder_id?: Types.ObjectId;
  title: string;
  body: string;
  channel: 'in_app';
  type?: string;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ReminderStats {
  unreadCount: number;
  overdueCount: number;
  dueTodayCount: number;
  completedCount: number;
  pendingCount: number;
  criticalCount: number;
}

export interface ReminderListFilters {
  status?: ReminderStatus | ReminderStatus[];
  priority?: ReminderPriority;
  type?: ReminderType;
  assigned_user_id?: string;
  is_read?: boolean;
  date_from?: Date;
  date_to?: Date;
  search?: string;
  sort?: string;
  scope?: Record<string, unknown>;
}
