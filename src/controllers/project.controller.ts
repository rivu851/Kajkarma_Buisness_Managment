import type { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import * as projectService from '../services/project.service.js';
import type { ProjectStatus } from '../constants/enums.js';

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const getProjects: RequestHandler = asyncHandler(async (req, res: Response) => {
  const q = (res.locals['query'] ?? req.query) as Record<string, string | number | undefined>;
  const result = await projectService.listProjects(Number(q.page ?? 1), Number(q.limit ?? 20), req.user!, {
    ...(q.status ? { status: String(q.status) } : {}),
    ...(q.client_id ? { client_id: String(q.client_id) } : {}),
    ...(q.category ? { category: String(q.category) } : {}),
    ...(q.priority ? { priority: String(q.priority) } : {}),
    ...(q.search ? { search: String(q.search) } : {}),
  });
  sendSuccess(res, result, 'Projects retrieved');
});

export const getProject: RequestHandler = asyncHandler(async (req, res: Response) => {
  const project = await projectService.getProjectById(param(req, 'id'), req.user!);
  sendSuccess(res, project, 'Project retrieved');
});

export const createProject: RequestHandler = asyncHandler(async (req, res: Response) => {
  const project = await projectService.createNewProject(req.body, req.user!);
  sendSuccess(res, project, 'Project created', 201);
});

export const updateProjectHandler: RequestHandler = asyncHandler(async (req, res: Response) => {
  const project = await projectService.updateProject(param(req, 'id'), req.body, req.user!);
  sendSuccess(res, project, 'Project updated');
});

export const deleteProject: RequestHandler = asyncHandler(async (req, res: Response) => {
  await projectService.removeProject(param(req, 'id'), req.user!);
  sendSuccess(res, null, 'Project deleted');
});

export const updateProjectStatus: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { status } = req.body as { status: ProjectStatus };
  const project = await projectService.changeProjectStatus(param(req, 'id'), status, req.user!);
  sendSuccess(res, project, 'Project status updated');
});

export const assignProject: RequestHandler = asyncHandler(async (req, res: Response) => {
  const { assigned_employees } = req.body as { assigned_employees: string[] };
  const project = await projectService.assignProjectTeam(
    param(req, 'id'),
    assigned_employees,
    req.user!
  );
  sendSuccess(res, project, 'Project team assigned');
});
