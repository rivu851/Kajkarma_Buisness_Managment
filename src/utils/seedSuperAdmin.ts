import { User } from '../models/user.model.js';
import { Role } from '../models/role.model.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { SYSTEM_ROLES } from '../constants/roles.js';

export async function seedSuperAdmin(): Promise<void> {
  const userCount = await User.countDocuments();
  if (userCount > 0) return; // users already exist, skip

  const superAdminRole = await Role.findOne({ name: SYSTEM_ROLES.SUPER_ADMIN });
  if (!superAdminRole) {
    logger.error('Super admin role not found — run seedSystemRoles first');
    return;
  }

  await User.create({
    name: 'Super Admin',
    email: env.SUPER_ADMIN_EMAIL,
    password: env.SUPER_ADMIN_PASSWORD, // pre-save hook hashes it automatically
    role_id: superAdminRole._id,
    source: 'seed',
    status: 'active',
  });

  logger.info(`Super admin created → email: ${env.SUPER_ADMIN_EMAIL}`);
  logger.warn('Change the super admin password immediately after first login!');
}
