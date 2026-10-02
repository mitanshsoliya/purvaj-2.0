import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminBrands = () => {
  return (
    <ModulePlaceholder
      title="Brand Management"
      category="Catalog Management"
      description="Manage brand partners, manufacturer details, brand logos, and authorized distributor permissions."
      plannedPhase="Phase 2 Catalog Implementation"
      apiEndpoint="/api/admin/brands"
      dbTable="public.brands"
      features={[
        'Brand profiles and authorization certificates',
        'Brand-specific margin calculations',
        'Direct manufacturer supply linkages',
        'Brand filtering in shop portal',
      ]}
    />
  );
};

export default AdminBrands;
