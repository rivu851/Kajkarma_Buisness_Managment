import { Role } from '../models/role.model.js';
import { SYSTEM_ROLES } from '../constants/roles.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../constants/permissions.js';
import { logger } from '../config/logger.js';

const systemRoleDescriptions: Record<string, string> = {
  super_admin: 'Full system access with no restrictions',
  admin: 'Operational administrator with access to most modules',
  sales_manager: 'Manages leads, clients, and sales team',
  sales_executive: 'Handles own leads and client communications',
  project_manager: 'Manages projects and team work logs',
  hr: 'Manages employee records and salary',
  finance: 'Manages revenue, payments, and financial records',
};

export async function seedSystemRoles(): Promise<void> {
  for (const roleName of Object.values(SYSTEM_ROLES)) {
    const existing = await Role.findOne({ name: roleName });
    if (existing) continue;

    await Role.create({
      name: roleName,
      description: systemRoleDescriptions[roleName] ?? '',
      is_system: true,
      permissions: DEFAULT_ROLE_PERMISSIONS[roleName] ?? {},
    });

    logger.info(`Seeded system role: ${roleName}`);
  }
}
