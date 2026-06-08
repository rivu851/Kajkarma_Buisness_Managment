import type { Types } from 'mongoose';
import type {
  LeadStage,
  LeadStatus,
  ClientStatus,
  CommunicationType,
  EntityType,
  ProjectCategory,
  ProjectStatus,
  ProjectPriority,
  PaymentStatus,
  EmployeeStatus,
  WorkStatus,
  RevenueType,
  RevenueStatus,
  PaymentMethod,
  SalaryStatus,
  SalaryPaymentMode,
  ReimbursementStatus,
  ReimbursementCategory,
  ReportType,
  SubscriptionStatus,
  BillingCycle,
  UpcomingPaymentType,
  UpcomingPaymentStatus,
} from '../constants/enums.js';

export interface ILeadHistoryEntry {
  action: string;
  note?: string;
  changed_by: Types.ObjectId;
  changed_at: Date;
}

export interface ILead {
  _id: Types.ObjectId;
  lead_name: string;
  phone_number?: string;
  email?: string;
  company_name?: string;
  sector?: string;
  source: string;
  stage: LeadStage;
  status: LeadStatus;
  tags: string[];
  notes?: string;
  follow_up_date?: Date;
  assigned_user_id?: Types.ObjectId;
  created_by: Types.ObjectId;
  converted_at?: Date;
  client_id?: Types.ObjectId;
  history: ILeadHistoryEntry[];
  created_at: Date;
  updated_at: Date;
}

export interface IClient {
  _id: Types.ObjectId;
  company_name: string;
  contact_person_name: string;
  email?: string;
  phone_number?: string;
  website_link?: string;
  social_media_links: Record<string, string>;
  sector?: string;
  address?: string;
  status: ClientStatus;
  assigned_manager_id?: Types.ObjectId;
  notes?: string;
  source_lead_id?: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface ICommunication {
  _id: Types.ObjectId;
  entity_type: EntityType;
  entity_id: Types.ObjectId;
  user_id: Types.ObjectId;
  date: Date;
  type: CommunicationType;
  notes?: string;
  outcome?: string;
  next_follow_up_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IProjectFile {
  name: string;
  url: string;
  uploaded_at: Date;
}

export interface IProject {
  _id: Types.ObjectId;
  project_name: string;
  client_id: Types.ObjectId;
  category: ProjectCategory;
  start_date?: Date;
  end_date?: Date;
  status: ProjectStatus;
  priority: ProjectPriority;
  assigned_employees: Types.ObjectId[];
  payment_status: PaymentStatus;
  notes?: string;
  files: IProjectFile[];
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IEmployee {
  _id: Types.ObjectId;
  user_id?: Types.ObjectId;
  full_name: string;
  date_of_birth?: Date;
  phone_number?: string;
  email?: string;
  department: string;
  role_designation: string;
  joining_date: Date;
  salary?: number;
  salary_day?: number;
  pending_salary: number;
  bank_account_holder?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  upi_id?: string;
  status: EmployeeStatus;
  created_at: Date;
  updated_at: Date;
}

export interface IWorklog {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  date: Date;
  project_id: Types.ObjectId;
  task_title: string;
  task_description?: string;
  time_spent_hours: number;
  work_status: WorkStatus;
  remarks?: string;
  started_at: Date;
  completed_at?: Date | null;
  paused_duration_minutes: number;
  last_paused_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface WorklogGroup {
  project_id: Types.ObjectId;
  project_name: string;
  project_status: string;
  client_id?: Types.ObjectId;
  total_hours: number;
  entries_count: number;
  logs: IWorklog[];
}

export interface IRevenue {
  _id: Types.ObjectId;
  client_id: Types.ObjectId;
  project_id?: Types.ObjectId;
  title: string;
  amount: number;
  received_amount: number;
  due_date?: Date;
  revenue_date: Date;
  type: RevenueType;
  status: RevenueStatus;
  notes?: string;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IPayment {
  _id: Types.ObjectId;
  revenue_id: Types.ObjectId;
  client_id: Types.ObjectId;
  project_id?: Types.ObjectId;
  amount: number;
  payment_date: Date;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface ISalary {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  month: number;
  year: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  net_salary: number;
  payment_mode?: SalaryPaymentMode;
  payment_date?: Date;
  status: SalaryStatus;
  notes?: string;
  paid_by?: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IReimbursement {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  expense_title: string;
  amount: number;
  expense_date: Date;
  reason: string;
  category: ReimbursementCategory;
  project_id?: Types.ObjectId;
  client_id?: Types.ObjectId;
  bill_attachment_url?: string;
  status: ReimbursementStatus;
  approved_by?: Types.ObjectId;
  approval_date?: Date;
  paid_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IReport {
  _id: Types.ObjectId;
  client_id: Types.ObjectId;
  project_id?: Types.ObjectId;
  report_title: string;
  report_type: ReportType;
  month: Date;
  file_url: string;
  uploaded_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IUpcomingPayment {
  _id: Types.ObjectId;
  client_id: Types.ObjectId;
  project_id?: Types.ObjectId;
  revenue_id?: Types.ObjectId;
  amount: number;
  due_date: Date;
  payment_type: UpcomingPaymentType;
  payment_status: UpcomingPaymentStatus;
  reminder_date?: Date;
  assigned_follow_up_user?: Types.ObjectId;
  notes?: string;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface ISubscription {
  _id: Types.ObjectId;
  plan_name: string;
  provider: string;
  start_date: Date;
  end_date: Date;
  renewal_date: Date;
  amount: number;
  billing_cycle: BillingCycle;
  status: SubscriptionStatus;
  assigned_to?: string;
  notes?: string;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IAttendanceSession {
  _id: Types.ObjectId;
  check_in: Date;
  check_out?: Date;
  duration_minutes?: number;
}

export interface IAttendance {
  _id: Types.ObjectId;
  employee_id: Types.ObjectId;
  date: Date;
  sessions: IAttendanceSession[];
  total_minutes: number;
  is_checked_in: boolean;
  created_at: Date;
  updated_at: Date;
}
