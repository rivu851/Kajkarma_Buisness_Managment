export interface DigestReminderItem {
  title: string;
  dueDate: string;
  module: string;
}

export interface DigestAlertItem {
  title: string;
  description: string;
}

export interface DigestSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReminderDigestPayload {
  alerts: DigestAlertItem[];
  overdue: DigestReminderItem[];
  dueToday: DigestReminderItem[];
  upcoming: DigestReminderItem[];
  summary: DigestSummary;
}
