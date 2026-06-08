import {
  findAllWorklogs,
  findWorklogById,
  createWorklog,
  updateWorklogById,
  deleteWorklogById,
  findWorklogsGroupedByProject,
} from '../repositories/worklog.repository.js';
import {
  projectExists,
  isEmployeeAssignedToProject,
} from '../repositories/project.repository.js';
import { findEmployeeById, findEmployeeByUserId } from '../repositories/employee.repository.js';
import { findRoleById } from '../repositories/role.repository.js';
import { findAccessControl } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { omitUndefined } from '../utils/omitUndefined.js';
import { toObjectId } from '../utils/recordScope.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { IWorklog, WorklogGroup } from '../types/business.js';
import type { JwtPayload, PaginatedResult } from '../types/index.js';
import type { ModulePermission } from '../constants/permissions.js';

/**
 * Returns true if the user can see and modify any worklog (not just their own).
 *
 * Fast-path for system roles that have always had management access.
 * For custom roles, grants management access when ALL four worklog actions are enabled —
 * the intent of giving a role full worklog permissions is that they can manage any record.
 */
async function hasWorklogManagementAccess(user: JwtPayload): Promise<boolean> {
  if (
    user.roleName === SYSTEM_ROLES.SUPER_ADMIN ||
    user.roleName === SYSTEM_ROLES.ADMIN ||
    user.roleName === SYSTEM_ROLES.PROJECT_MANAGER ||
    user.roleName === SYSTEM_ROLES.HR
  ) return true;

  const [role, ac] = await Promise.all([
    findRoleById(user.roleId),
    findAccessControl(user.userId),
  ]);
  if (!role) return false;

  const perms = role.permissions as unknown as Record<string, ModulePermission>;
  const overrides = ac?.module_permissions as unknown as Record<string, ModulePermission> | undefined;
  const effective: ModulePermission | undefined = overrides?.['worklogs'] ?? perms['worklogs'];

  return !!(effective?.read && effective?.create && effective?.update && effective?.delete);
}

async function getWorklogScope(
  user: JwtPayload,
  isManager: boolean
): Promise<Record<string, unknown>> {
  if (isManager) return {};
  const employee = await findEmployeeByUserId(user.userId);
  if (!employee) return { employee_id: toObjectId('000000000000000000000000') };
  return { employee_id: employee._id };
}

async function assertWorklogAccess(
  worklog: IWorklog,
  isManager: boolean,
  employeeId?: string
): Promise<void> {
  if (isManager) return;
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
  const isManager = await hasWorklogManagementAccess(user);
  const scope = await getWorklogScope(user, isManager);

  if (!isManager && filters.employee_id) {
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

  const isManager = await hasWorklogManagementAccess(user);
  const ownEmployee = isManager ? null : await findEmployeeByUserId(user.userId);
  await assertWorklogAccess(worklog, isManager, ownEmployee?._id.toString());
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
  const isManager = await hasWorklogManagementAccess(user);
  const employeeId = await resolveEmployeeId(user, data.employee_id, isManager);

  if (!(await projectExists(data.project_id))) {
    throw new AppError('Project not found', 404);
  }

  const assigned = await isEmployeeAssignedToProject(data.project_id, employeeId);
  if (!assigned && !isManager) {
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

  const isManager = await hasWorklogManagementAccess(user);
  const ownEmployee = isManager ? null : await findEmployeeByUserId(user.userId);
  await assertWorklogAccess(existing, isManager, ownEmployee?._id.toString());

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

  const isManager = await hasWorklogManagementAccess(user);
  const ownEmployee = isManager ? null : await findEmployeeByUserId(user.userId);
  await assertWorklogAccess(existing, isManager, ownEmployee?._id.toString());

  const deleted = await deleteWorklogById(id);
  if (!deleted) throw new AppError('Work log not found', 404);
}

async function resolveEmployeeId(
  user: JwtPayload,
  requestedId: string | undefined,
  isManager: boolean
): Promise<string> {
  if (requestedId) {
    if (!isManager) {
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

export async function listWorklogsGrouped(
  user: JwtPayload,
  filters: {
    employee_id?: string;
    work_status?: string;
    date_from?: Date;
    date_to?: Date;
  }
): Promise<WorklogGroup[]> {
  const isManager = await hasWorklogManagementAccess(user);
  const scope = await getWorklogScope(user, isManager);

  if (!isManager && filters.employee_id) {
    const ownEmployee = await findEmployeeByUserId(user.userId);
    if (ownEmployee && filters.employee_id !== ownEmployee._id.toString()) {
      throw new AppError('Cannot view other employees work logs', 403);
    }
  }

  return findWorklogsGroupedByProject(
    omitUndefined({
      employee_id: filters.employee_id,
      work_status: filters.work_status,
      date_from: filters.date_from,
      date_to: filters.date_to,
      scope,
    }) as Parameters<typeof findWorklogsGroupedByProject>[0]
  );
}
