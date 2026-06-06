import type { JwtPayload } from '../types/index.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import type { ReminderModule } from '../constants/enums.js';
import { toObjectId } from './recordScope.js';

const MODULE_SCOPE: Partial<Record<string, ReminderModule[]>> = {
  [SYSTEM_ROLES.SALES_MANAGER]: ['leads', 'clients', 'communications', 'upcoming-payments'],
  [SYSTEM_ROLES.PROJECT_MANAGER]: ['projects', 'reports', 'worklogs'],
  [SYSTEM_ROLES.HR]: ['salary', 'reimbursements', 'employees'],
  [SYSTEM_ROLES.FINANCE]: [
    'salary',
    'upcoming-payments',
    'subscriptions',
    'reimbursements',
    'revenue',
  ],
};

export function reminderListScope(user: JwtPayload): Record<string, unknown> {
  const notDeleted = { deleted_at: { $exists: false } };

  const modules = MODULE_SCOPE[user.roleName];
  if (modules) {
    return {
      ...notDeleted,
      $or: [
        { assigned_user_id: toObjectId(user.userId) },
        { related_module: { $in: modules } },
      ],
    };
  }

  return {
    ...notDeleted,
    assigned_user_id: toObjectId(user.userId),
  };
}

export function reminderMyScope(user: JwtPayload): Record<string, unknown> {
  return {
    deleted_at: { $exists: false },
    assigned_user_id: toObjectId(user.userId),
  };
}

export function canViewReminderAudit(user: JwtPayload): boolean {
  return user.roleName === SYSTEM_ROLES.SUPER_ADMIN;
}
