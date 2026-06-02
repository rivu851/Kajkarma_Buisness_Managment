import { Project } from '../models/project.model.js';
import type { IProject } from '../types/business.js';
import type { PaginatedResult } from '../types/index.js';
import type { Types } from 'mongoose';

export interface ProjectListFilters {
  status?: string;
  client_id?: string;
  category?: string;
  priority?: string;
  scope?: Record<string, unknown>;
}

export async function findAllProjects(
  page: number,
  limit: number,
  filters: ProjectListFilters,
  search?: string
): Promise<PaginatedResult<IProject>> {
  const query: Record<string, unknown> = { ...filters.scope };

  if (filters.status) query['status'] = filters.status;
  if (filters.client_id) query['client_id'] = filters.client_id;
  if (filters.category) query['category'] = filters.category;
  if (filters.priority) query['priority'] = filters.priority;

  if (search) {
    query['project_name'] = { $regex: search, $options: 'i' };
  }

  const [data, total] = await Promise.all([
    Project.find(query)
      .populate('client_id', 'company_name contact_person_name')
      .populate('assigned_employees', 'full_name department role_designation')
      .populate('created_by', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })
      .lean(),
    Project.countDocuments(query),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findProjectById(id: string | Types.ObjectId): Promise<IProject | null> {
  return Project.findById(id)
    .populate('client_id', 'company_name contact_person_name status')
    .populate('assigned_employees', 'full_name department role_designation email')
    .populate('created_by', 'name email')
    .lean();
}

export async function createProject(data: Partial<IProject>): Promise<IProject> {
  const project = new Project(data);
  return (await project.save()).toObject() as IProject;
}

export async function updateProjectById(
  id: string | Types.ObjectId,
  data: Partial<IProject>
): Promise<IProject | null> {
  return Project.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .populate('client_id', 'company_name')
    .populate('assigned_employees', 'full_name department')
    .populate('created_by', 'name email')
    .lean();
}

export async function deleteProjectById(id: string | Types.ObjectId): Promise<IProject | null> {
  return Project.findByIdAndDelete(id).lean();
}

export async function projectExists(id: string | Types.ObjectId): Promise<boolean> {
  return (await Project.countDocuments({ _id: id })) > 0;
}

export async function isEmployeeAssignedToProject(
  projectId: string | Types.ObjectId,
  employeeId: string | Types.ObjectId
): Promise<boolean> {
  return (
    (await Project.countDocuments({
      _id: projectId,
      assigned_employees: employeeId,
    })) > 0
  );
}
