import { Router } from 'express';
import { getOverview } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/overview', requirePermission('dashboard', 'read'), getOverview);

export default router;
