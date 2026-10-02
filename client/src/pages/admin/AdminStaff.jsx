import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminStaff = () => {
  return (
    <ModulePlaceholder
      title="Staff Roles & Permissions"
      category="User & Access Control"
      description="Manage warehouse managers, billing clerks, dispatch coordinators, and delivery team access levels with granular permissions."
      plannedPhase="Phase 13 RBAC & Staff Management"
      apiEndpoint="/api/admin/staff"
      dbTable="public.users, public.roles, public.permissions"
      features={[
        'Role-Based Access Control (Super Admin, Warehouse Manager, Billing Clerk, Dispatcher)',
        'Granular module access toggles',
        'Staff activity audit logging',
        'Two-factor authentication (2FA) policy enforcement',
      ]}
    />
  );
};

export default AdminStaff;
