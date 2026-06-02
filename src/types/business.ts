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
  created_at: Date;
  updated_at: Date;
}
