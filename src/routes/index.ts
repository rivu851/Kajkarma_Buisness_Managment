import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import roleRoutes from './roles.routes.js';
import leadRoutes from './leads.routes.js';
import clientRoutes from './clients.routes.js';
import communicationRoutes from './communications.routes.js';
import projectRoutes from './projects.routes.js';
import employeeRoutes from './employees.routes.js';
import worklogRoutes from './worklogs.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/leads', leadRoutes);
router.use('/clients', clientRoutes);
router.use('/communications', communicationRoutes);
router.use('/projects', projectRoutes);
router.use('/employees', employeeRoutes);
router.use('/worklogs', worklogRoutes);

export default router;
