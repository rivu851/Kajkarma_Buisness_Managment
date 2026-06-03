export const MODULES = [
  'users',
  'roles',
  'leads',
  'clients',
  'communications',
  'reminders',
  'projects',
  'employees',
  'worklogs',
  'revenue',
  'payments',
  'salary',
  'reimbursements',
  'reports',
  'subscriptions',
  'dashboard',
  'forecasting',
] as const;

export type Module = (typeof MODULES)[number];

export const ACTIONS = ['read', 'create', 'update', 'delete'] as const;
export type Action = (typeof ACTIONS)[number];

export type ModulePermission = {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
};

export type RolePermissions = Partial<Record<Module, ModulePermission>>;

const FULL: ModulePermission = { read: true, create: true, update: true, delete: true };
const READ_ONLY: ModulePermission = { read: true, create: false, update: false, delete: false };
const NO_ACCESS: ModulePermission = { read: false, create: false, update: false, delete: false };

export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  super_admin: Object.fromEntries(
    MODULES.map((m) => [m, FULL])
  ) as RolePermissions,

  admin: {
    users: FULL,
    roles: READ_ONLY,
    leads: FULL,
    clients: FULL,
    communications: FULL,
    reminders: FULL,
    projects: FULL,
    employees: { read: true, create: true, update: true, delete: false },
    worklogs: FULL,
    revenue: READ_ONLY,
    payments: READ_ONLY,
    salary: READ_ONLY,
    reimbursements: FULL,
    reports: FULL,
    subscriptions: READ_ONLY,
    dashboard: READ_ONLY,
    forecasting: READ_ONLY,
  },

  sales_manager: {
    leads: FULL,
    clients: FULL,
    communications: FULL,
    reminders: FULL,
    dashboard: READ_ONLY,
    reports: READ_ONLY,
    users: NO_ACCESS,
    roles: NO_ACCESS,
    employees: NO_ACCESS,
    salary: NO_ACCESS,
    revenue: NO_ACCESS,
    payments: NO_ACCESS,
  },

  sales_executive: {
    leads: { read: true, create: true, update: true, delete: false },
    clients: { read: true, create: true, update: true, delete: false },
    communications: FULL,
    reminders: FULL,
    projects: READ_ONLY,
    worklogs: { read: true, create: true, update: true, delete: false },
    dashboard: READ_ONLY,
    users: NO_ACCESS,
    roles: NO_ACCESS,
    employees: NO_ACCESS,
    salary: NO_ACCESS,
    revenue: NO_ACCESS,
  },

  project_manager: {
    projects: FULL,
    employees: READ_ONLY,
    worklogs: { read: true, create: true, update: true, delete: false },
    reports: FULL,
    reminders: FULL,
    clients: READ_ONLY,
    dashboard: READ_ONLY,
    salary: NO_ACCESS,
    revenue: NO_ACCESS,
    roles: NO_ACCESS,
  },

  hr: {
    employees: FULL,
    salary: FULL,
    reimbursements: FULL,
    reminders: FULL,
    dashboard: READ_ONLY,
    revenue: NO_ACCESS,
    roles: NO_ACCESS,
  },

  finance: {
    revenue: FULL,
    payments: FULL,
    salary: FULL,
    reimbursements: FULL,
    subscriptions: FULL,
    reminders: FULL,
    dashboard: READ_ONLY,
    employees: READ_ONLY,
    roles: NO_ACCESS,
  },
};
