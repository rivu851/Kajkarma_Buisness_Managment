import type { ReminderPriority } from '../constants/enums.js';

export interface DigestReminderItem {
  title: string;
  dueDate: string;
  module: string;
}

export interface DigestSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReminderDigestPayload {
  overdue: DigestReminderItem[];
  dueToday: DigestReminderItem[];
  upcoming: DigestReminderItem[];
  summary: DigestSummary;
}
