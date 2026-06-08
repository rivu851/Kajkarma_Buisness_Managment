import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceList,
  getAttendanceRecord,
} from '../controllers/attendance.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listAttendanceSchema,
  attendanceIdParamSchema,
} from '../validations/attendance.validation.js';

const router = Router();

router.use(authenticate);

// Self-service endpoints — any authenticated user with attendance read/create access
router.post('/checkin', requirePermission('attendance', 'create'), checkIn);
router.post('/checkout', requirePermission('attendance', 'update'), checkOut);
router.get('/today', requirePermission('attendance', 'read'), getTodayAttendance);

// List & single record
router.get('/', requirePermission('attendance', 'read'), validate(listAttendanceSchema), getAttendanceList);
router.get('/:id', requirePermission('attendance', 'read'), validate(attendanceIdParamSchema), getAttendanceRecord);

export default router;
