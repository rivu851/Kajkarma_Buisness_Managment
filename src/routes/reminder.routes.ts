import { Router } from 'express';
import {
  getReminders,
  getMyReminders,
  getReminderStats,
  getReminder,
  createReminder,
  markRead,
  markUnread,
  markDone,
  snoozeReminder,
  rescheduleReminderHandler,
  deleteReminder,
} from '../controllers/reminder.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import {
  listRemindersSchema,
  createReminderSchema,
  snoozeReminderSchema,
  rescheduleReminderSchema,
  reminderIdSchema,
} from '../validations/reminder.validation.js';

const router = Router();

router.use(authenticate);

router.get('/stats', requirePermission('reminders', 'read'), getReminderStats);
router.get('/my', requirePermission('reminders', 'read'), validate(listRemindersSchema), getMyReminders);
router.get('/', requirePermission('reminders', 'read'), validate(listRemindersSchema), getReminders);
router.post('/', requirePermission('reminders', 'create'), validate(createReminderSchema), createReminder);
router.get('/:id', requirePermission('reminders', 'read'), getReminder);
router.patch('/:id/read', requirePermission('reminders', 'update'), validate(reminderIdSchema), markRead);
router.patch('/:id/unread', requirePermission('reminders', 'update'), validate(reminderIdSchema), markUnread);
router.patch('/:id/done', requirePermission('reminders', 'update'), validate(reminderIdSchema), markDone);
router.patch('/:id/snooze', requirePermission('reminders', 'update'), validate(snoozeReminderSchema), snoozeReminder);
router.patch(
  '/:id/reschedule',
  requirePermission('reminders', 'update'),
  validate(rescheduleReminderSchema),
  rescheduleReminderHandler
);
router.delete('/:id', requirePermission('reminders', 'delete'), validate(reminderIdSchema), deleteReminder);

export default router;
