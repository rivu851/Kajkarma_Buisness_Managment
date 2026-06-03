import { apiRequest } from './client';
import type { PaginatedReminders, Reminder, ReminderStats } from '../types/reminder';

export async function fetchReminderStats(): Promise<ReminderStats> {
  return apiRequest<ReminderStats>('/reminders/stats');
}

export async function fetchMyReminders(params: Record<string, string | number | boolean> = {}): Promise<PaginatedReminders> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const q = qs.toString();
  return apiRequest<PaginatedReminders>(`/reminders/my${q ? `?${q}` : ''}`);
}

export async function fetchReminders(params: Record<string, string | number | boolean> = {}): Promise<PaginatedReminders> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const q = qs.toString();
  return apiRequest<PaginatedReminders>(`/reminders${q ? `?${q}` : ''}`);
}

export async function createReminder(body: {
  title: string;
  description?: string;
  priority: string;
  reminder_date: string;
  reminder_time?: string;
  assigned_user_id: string;
}): Promise<Reminder> {
  return apiRequest<Reminder>('/reminders', { method: 'POST', body: JSON.stringify(body) });
}

export async function patchReminderAction(id: string, action: 'read' | 'unread' | 'done' | 'snooze' | 'reschedule', body?: object): Promise<Reminder> {
  const path =
    action === 'read' ? 'read' :
    action === 'unread' ? 'unread' :
    action === 'done' ? 'done' :
    action === 'snooze' ? 'snooze' : 'reschedule';
  return apiRequest<Reminder>(`/reminders/${id}/${path}`, {
    method: 'PATCH',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export async function deleteReminder(id: string): Promise<void> {
  await apiRequest<null>(`/reminders/${id}`, { method: 'DELETE' });
}

export async function fetchReminderById(id: string): Promise<Reminder> {
  return apiRequest<Reminder>(`/reminders/${id}`);
}
