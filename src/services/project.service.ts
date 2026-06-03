import {
  findAllProjects,
  findProjectById,
  createProject,
  updateProjectById,
  deleteProjectById,
} from '../repositories/project.repository.js';
import { clientExists } from '../repositories/client.repository.js';
import {
  findEmployeeById,
  findEmployeeByUserId,
  employeeExists,
} from '../repositories/employee.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import {
  projectListScope,
  hasFullRecordAccess,
  toObjectId,
} from '../utils/recordScope.js';
import type { IProject } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';
import type { ProjectStatus } from '../constants/enums.js';

async function assertProjectRecordAccess(project: IProject, user: JwtPayload): Promise<void> {
  if (hasFullRecordAccess(user)) return;

  const employee = await findEmployeeByUserId(user.userId);
  if (!employee) {
    throw new AppError('Access denied to this project', 403);
  }

  const assigned = project.assigned_employees.map((id) => id.toString());
  if (!assigned.includes(employee._id.toString())) {
    throw new AppError('Access denied to this project', 403);
  }
}

export async function listProjects(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: {
    status?: string;
    client_id?: string;
    category?: string;
    priority?: string;
    search?: string;
  }
): Promise<PaginatedResult<IProject>> {
  const employee = await findEmployeeByUserId(user.userId);
  const scope = projectListScope(user, employee?._id ?? null);

  return findAllProjects(
    page,
    limit,
    {
      ...omitUndefined({
        status: filters.status,
        client_id: filters.client_id,
        category: filters.category,
        priority: filters.priority,
      }),
      scope,
    },
    filters.search
  );
}

export async function getProjectById(id: string, user: JwtPayload): Promise<IProject> {
  const project = await findProjectById(id);
  if (!project) throw new AppError('Project not found', 404);
  await assertProjectRecordAccess(project, user);
  return project;
}

export async function createNewProject(
  data: Partial<IProject> & { client_id: string; assigned_employees?: string[] },
  user: JwtPayload
): Promise<IProject> {
  const clientOk = await clientExists(data.client_id);
  if (!clientOk) throw new AppError('Client not found', 404);

  if (data.assigned_employees?.length) {
    for (const empId of data.assigned_employees) {
      if (!(await employeeExists(empId))) {
        throw new AppError(`Employee ${empId} not found`, 404);
      }
    }
  }

  const employeeIds = (data.assigned_employees ?? []).map((id) =>
    toObjectId(typeof id === 'string' ? id : id.toString())
  );

  const project = await createProject({
    project_name: data.project_name!,
    client_id: toObjectId(data.client_id),
    category: data.category!,
    start_date: data.start_date,
    end_date: data.end_date,
    status: data.status,
    priority: data.priority,
    payment_status: data.payment_status,
    notes: data.notes,
    assigned_employees: employeeIds,
    created_by: toObjectId(user.userId),
    files: [],
  } as Partial<IProject>);

  return (await findProjectById(project._id))!;
}

export async function updateProject(
  id: string,
  data: Partial<IProject> & { assigned_employees?: string[] },
  user: JwtPayload
): Promise<IProject> {
  const existing = await findProjectById(id);
  if (!existing) throw new AppError('Project not found', 404);
  await assertProjectRecordAccess(existing, user);

  const updateData: Partial<IProject> = { ...data };
  if (data.assigned_employees) {
    for (const empId of data.assigned_employees) {
      if (!(await employeeExists(empId as unknown as string))) {
        throw new AppError(`Employee not found`, 404);
      }
    }
    updateData.assigned_employees = data.assigned_employees.map((eid) =>
      toObjectId(eid as unknown as string)
    );
  }

  const updated = await updateProjectById(id, updateData);
  if (!updated) throw new AppError('Project not found', 404);
  if (updated.status === 'completed' || updated.status === 'cancelled') {
    const { closePendingRemindersForRecord } = await import('./reminder.service.js');
    void closePendingRemindersForRecord(
      'projects',
      updated._id as import('mongoose').Types.ObjectId
    ).catch(() => undefined);
  }
  return updated;
}

export async function changeProjectStatus(
  id: string,
  status: ProjectStatus,
  user: JwtPayload
): Promise<IProject> {
  const existing = await findProjectById(id);
  if (!existing) throw new AppError('Project not found', 404);
  await assertProjectRecordAccess(existing, user);

  if (status === 'in_progress' && existing.assigned_employees.length === 0) {
    throw new AppError('Assign at least one employee before marking In Progress', 422);
  }
  if (status === 'in_progress' && !existing.end_date) {
    throw new AppError('Set a deadline before marking In Progress', 422);
  }

  const updated = await updateProjectById(id, { status });
  if (!updated) throw new AppError('Project not found', 404);
  if (status === 'completed' || status === 'cancelled') {
    const { closePendingRemindersForRecord } = await import('./reminder.service.js');
    void closePendingRemindersForRecord(
      'projects',
      updated._id as import('mongoose').Types.ObjectId
    ).catch(() => undefined);
  }
  return updated;
}

export async function assignProjectTeam(
  id: string,
  employeeIds: string[],
  user: JwtPayload
): Promise<IProject> {
  const existing = await findProjectById(id);
  if (!existing) throw new AppError('Project not found', 404);
  await assertProjectRecordAccess(existing, user);

  for (const empId of employeeIds) {
    const emp = await findEmployeeById(empId);
    if (!emp) throw new AppError(`Employee ${empId} not found`, 404);
  }

  const updated = await updateProjectById(id, {
    assigned_employees: employeeIds.map((eid) => toObjectId(eid)),
  });
  if (!updated) throw new AppError('Project not found', 404);
  return updated;
}

export async function removeProject(id: string, user: JwtPayload): Promise<void> {
  const existing = await findProjectById(id);
  if (!existing) throw new AppError('Project not found', 404);
  await assertProjectRecordAccess(existing, user);
  const deleted = await deleteProjectById(id);
  if (!deleted) throw new AppError('Project not found', 404);
}
