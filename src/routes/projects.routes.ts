import { Router } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProjectHandler,
  deleteProject,
  updateProjectStatus,
  assignProject,
} from '../controllers/project.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listProjectsSchema,
  createProjectSchema,
  updateProjectSchema,
  updateProjectStatusSchema,
  assignProjectSchema,
} from '../validations/project.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('projects', 'read'), validate(listProjectsSchema), getProjects);
router.post('/', requirePermission('projects', 'create'), validate(createProjectSchema), createProject);
router.get('/:id', requirePermission('projects', 'read'), getProject);
router.patch(
  '/:id',
  requirePermission('projects', 'update'),
  validate(updateProjectSchema),
  updateProjectHandler
);
router.delete('/:id', requirePermission('projects', 'delete'), deleteProject);
router.patch(
  '/:id/status',
  requirePermission('projects', 'update'),
  validate(updateProjectStatusSchema),
  updateProjectStatus
);
router.patch(
  '/:id/assign',
  requirePermission('projects', 'update'),
  validate(assignProjectSchema),
  assignProject
);

export default router;
