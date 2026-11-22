export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  CHEF: 'chef',
  WAITER: 'waiter',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ManagerPermissions = {
  CAN_EDIT_MENU: 'can_edit_menu',
  CAN_MANAGE_TABLES: 'can_manage_tables',
  CAN_MANAGE_OFFERS: 'can_manage_offers',
  CAN_SEE_DAILY_TOTAL: 'can_see_daily_total',
  CAN_ISSUE_REFUNDS: 'can_issue_refunds',
  CAN_MANAGE_STAFF: 'can_manage_staff',
  CAN_VIEW_REPORTS: 'can_view_reports',
  CAN_MANAGE_SETTINGS: 'can_manage_settings',
} as const;

export type ManagerPermission = (typeof ManagerPermissions)[keyof typeof ManagerPermissions];

