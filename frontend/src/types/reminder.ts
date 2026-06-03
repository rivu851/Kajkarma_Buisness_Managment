export type ReminderPriority = 'low' | 'medium' | 'high' | 'critical';
export type ReminderStatus = 'pending' | 'done' | 'snoozed' | 'rescheduled' | 'cancelled';

export interface ReminderAuditEntry {
  action: string;
  user_id: string;
  timestamp: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
}

export interface Reminder {
  _id: string;
  type: string;
  title: string;
  description?: string;
  priority: ReminderPriority;
  related_module: string;
  related_record_id?: string;
  assigned_user_id: string;
  reminder_date: string;
  reminder_time?: string;
  status: ReminderStatus;
  is_read: boolean;
  snoozed_until?: string;
  completed_at?: string;
  audit_history?: ReminderAuditEntry[];
  created_at: string;
  updated_at: string;
}

export interface ReminderStats {
  unreadCount: number;
  overdueCount: number;
  dueTodayCount: number;
  completedCount: number;
  pendingCount: number;
  criticalCount: number;
}

export interface PaginatedReminders {
  data: Reminder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
