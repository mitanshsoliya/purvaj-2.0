import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminSettings = () => {
  return (
    <ModulePlaceholder
      title="Platform & Warehouse Settings"
      category="System Configuration"
      description="Configure business legal details, GST numbers, single central warehouse parameters, invoice numbering rules, and payment gateways."
      plannedPhase="Platform Settings"
      apiEndpoint="/api/admin/settings"
      dbTable="public.business_profiles, public.system_settings"
      features={[
        'Business legal name, GSTIN, PAN, and corporate address',
        'Central Warehouse operating hours and dispatch cut-off times',
        'Sequential tax invoice prefix and numbering format',
        'Minimum order value (MOV) and credit approval thresholds',
      ]}
    />
  );
};

export default AdminSettings;
