export const LEAD_STAGES = [
  'new',
  'contacted',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STATUSES = ['active', 'on_hold', 'unresponsive', 'dropped'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CLIENT_STATUSES = ['active', 'on_hold', 'churned', 'prospect'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const COMMUNICATION_TYPES = [
  'call',
  'email',
  'whatsapp',
  'meeting',
  'video_call',
] as const;
export type CommunicationType = (typeof COMMUNICATION_TYPES)[number];

export const ENTITY_TYPES = ['lead', 'client'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const PROJECT_CATEGORIES = [
  'web_app',
  'mobile_app',
  'seo',
  'digital_marketing',
  'social_media',
  'graphic_design',
  'content',
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_STATUSES = [
  'not_started',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type ProjectPriority = (typeof PROJECT_PRIORITIES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'fully_paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const EMPLOYEE_STATUSES = ['active', 'on_leave', 'resigned', 'terminated'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const WORK_STATUSES = ['in_progress', 'completed', 'blocked'] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];
