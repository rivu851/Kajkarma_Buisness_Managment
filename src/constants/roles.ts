export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SALES_MANAGER: 'sales_manager',
  SALES_EXECUTIVE: 'sales_executive',
  PROJECT_MANAGER: 'project_manager',
  HR: 'hr',
  FINANCE: 'finance',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const ROLE_HIERARCHY: Record<SystemRole, number> = {
  super_admin: 100,
  admin: 80,
  sales_manager: 60,
  project_manager: 60,
  hr: 60,
  finance: 60,
  sales_executive: 40,
};
