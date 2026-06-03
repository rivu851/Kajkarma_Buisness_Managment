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

    if (!existing) {
      await Role.create({
        name: roleName,
        description: systemRoleDescriptions[roleName] ?? '',
        is_system: true,
        permissions: DEFAULT_ROLE_PERMISSIONS[roleName] ?? {},
      });
      logger.info(`Seeded system role: ${roleName}`);
      continue;
    }

    // Sync permissions from defaults — adds missing modules and updates changed ones
    const defaults = DEFAULT_ROLE_PERMISSIONS[roleName] ?? {};
    const current = (existing.permissions ?? {}) as Record<string, unknown>;
    const toSync: Record<string, unknown> = {};

    for (const [module, perms] of Object.entries(defaults)) {
      const cur = current[module] as Record<string, boolean> | undefined;
      const def = perms as Record<string, boolean>;
      const changed =
        !cur ||
        cur.read !== def.read ||
        cur.create !== def.create ||
        cur.update !== def.update ||
        cur.delete !== def.delete;

      if (changed) toSync[module] = perms;
    }

    if (Object.keys(toSync).length > 0) {
      await Role.updateOne(
        { _id: existing._id },
        { $set: Object.fromEntries(Object.entries(toSync).map(([m, p]) => [`permissions.${m}`, p])) }
      );
      logger.info(`Synced permissions for role: ${roleName} → updated: ${Object.keys(toSync).join(', ')}`);
    }
  }
}
