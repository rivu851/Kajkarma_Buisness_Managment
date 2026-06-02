import {
  findAllWorklogs,
  findWorklogById,
  createWorklog,
  updateWorklogById,
  deleteWorklogById,
} from '../repositories/worklog.repository.js';
import {
  projectExists,
  isEmployeeAssignedToProject,
} from '../repositories/project.repository.js';
import { findEmployeeById, findEmployeeByUserId } from '../repositories/employee.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { hasFullRecordAccess, toObjectId } from '../utils/recordScope.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { IWorklog } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';

async function getWorklogScope(user: JwtPayload): Promise<Record<string, unknown>> {
  if (
    user.roleName === SYSTEM_ROLES.SUPER_ADMIN ||
    user.roleName === SYSTEM_ROLES.ADMIN ||
    user.roleName === SYSTEM_ROLES.PROJECT_MANAGER ||
    user.roleName === SYSTEM_ROLES.HR
  ) {
    return {};
  }

  const employee = await findEmployeeByUserId(user.userId);
  if (!employee) return { employee_id: toObjectId('000000000000000000000000') };
  return { employee_id: employee._id };
}

function assertWorklogAccess(worklog: IWorklog, user: JwtPayload, employeeId?: string): void {
  if (hasFullRecordAccess(user)) return;
  if (
    user.roleName === SYSTEM_ROLES.PROJECT_MANAGER ||
    user.roleName === SYSTEM_ROLES.HR
  ) {
    return;
  }

  if (employeeId && worklog.employee_id.toString() === employeeId) return;
  throw new AppError('Access denied to this work log', 403);
}

export async function listWorklogs(
  page: number,
  limit: number,
  user: JwtPayload,
  filters: {
    employee_id?: string;
    project_id?: string;
    work_status?: string;
    date_from?: Date;
    date_to?: Date;
  }
): Promise<PaginatedResult<IWorklog>> {
  const scope = await getWorklogScope(user);

  if (!hasFullRecordAccess(user) && filters.employee_id) {
    const ownEmployee = await findEmployeeByUserId(user.userId);
    if (ownEmployee && filters.employee_id !== ownEmployee._id.toString()) {
      throw new AppError('Cannot view other employees work logs', 403);
    }
  }

  return findAllWorklogs(page, limit, {
    ...omitUndefined({
      employee_id: filters.employee_id,
      project_id: filters.project_id,
      work_status: filters.work_status,
      date_from: filters.date_from,
      date_to: filters.date_to,
    }),
    scope,
  });
}

export async function getWorklogById(id: string, user: JwtPayload): Promise<IWorklog> {
  const worklog = await findWorklogById(id);
  if (!worklog) throw new AppError('Work log not found', 404);

  const ownEmployee = await findEmployeeByUserId(user.userId);
  assertWorklogAccess(worklog, user, ownEmployee?._id.toString());
  return worklog;
}

export async function createNewWorklog(
  data: {
    employee_id?: string;
    date: Date;
    project_id: string;
    task_title: string;
    task_description?: string;
    time_spent_hours: number;
    work_status?: string;
    remarks?: string;
  },
  user: JwtPayload
): Promise<IWorklog> {
  const employeeId = await resolveEmployeeId(user, data.employee_id);

  if (!(await projectExists(data.project_id))) {
    throw new AppError('Project not found', 404);
  }

  const assigned = await isEmployeeAssignedToProject(data.project_id, employeeId);
  if (!assigned && !hasFullRecordAccess(user) && user.roleName !== SYSTEM_ROLES.PROJECT_MANAGER) {
    throw new AppError('Employee is not assigned to this project', 422);
  }

  const worklog = await createWorklog(
    omitUndefined({
      employee_id: toObjectId(employeeId),
      date: data.date,
      project_id: toObjectId(data.project_id),
      task_title: data.task_title,
      task_description: data.task_description,
      time_spent_hours: data.time_spent_hours,
      work_status: (data.work_status ?? 'in_progress') as IWorklog['work_status'],
      remarks: data.remarks,
    }) as Partial<IWorklog>
  );

  return (await findWorklogById(worklog._id))!;
}

export async function updateWorklog(
  id: string,
  data: Partial<IWorklog> & { project_id?: string },
  user: JwtPayload
): Promise<IWorklog> {
  const existing = await findWorklogById(id);
  if (!existing) throw new AppError('Work log not found', 404);

  const ownEmployee = await findEmployeeByUserId(user.userId);
  assertWorklogAccess(existing, user, ownEmployee?._id.toString());

  if (data.project_id && !(await projectExists(data.project_id.toString()))) {
    throw new AppError('Project not found', 404);
  }

  const updatePayload: Partial<IWorklog> = { ...data };
  if (data.project_id) {
    updatePayload.project_id = toObjectId(data.project_id.toString());
  }

  const updated = await updateWorklogById(id, updatePayload);
  if (!updated) throw new AppError('Work log not found', 404);
  return updated;
}

export async function removeWorklog(id: string, user: JwtPayload): Promise<void> {
  const existing = await findWorklogById(id);
  if (!existing) throw new AppError('Work log not found', 404);

  const ownEmployee = await findEmployeeByUserId(user.userId);
  assertWorklogAccess(existing, user, ownEmployee?._id.toString());

  const deleted = await deleteWorklogById(id);
  if (!deleted) throw new AppError('Work log not found', 404);
}

async function resolveEmployeeId(user: JwtPayload, requestedId?: string): Promise<string> {
  if (requestedId) {
    if (
      !hasFullRecordAccess(user) &&
      user.roleName !== SYSTEM_ROLES.PROJECT_MANAGER &&
      user.roleName !== SYSTEM_ROLES.HR
    ) {
      const own = await findEmployeeByUserId(user.userId);
      if (!own || own._id.toString() !== requestedId) {
        throw new AppError('Cannot create work logs for other employees', 403);
      }
    }
    const emp = await findEmployeeById(requestedId);
    if (!emp) throw new AppError('Employee not found', 404);
    return requestedId;
  }

  const own = await findEmployeeByUserId(user.userId);
  if (!own) throw new AppError('No employee profile linked to your account', 404);
  return own._id.toString();
}
