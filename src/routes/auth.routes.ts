import { Router } from 'express';
import { login, logout, refresh, me } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validation.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authRateLimit } from '../middlewares/rateLimit.middleware.js';
import { loginSchema, refreshSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', validate(refreshSchema), refresh);
router.get('/me', authenticate, me);

export default router;
