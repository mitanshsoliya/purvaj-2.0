import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminReturns = () => {
  return (
    <ModulePlaceholder
      title="Returns & Replacement Claims"
      category="Warehouse Operations"
      description="Process retailer damage claims, transit breakages, defective lot returns, and issue replacement goods or credit notes."
      plannedPhase="Phase 9 Returns & Replacements"
      apiEndpoint="/api/admin/returns"
      dbTable="public.return_requests, public.credit_notes"
      features={[
        'Photo proof verification for in-transit damages',
        'Direct credit note generation into retailer ledger',
        'Damaged stock write-off to quarantine warehouse bin',
        'Driver pickup verification during next delivery run',
      ]}
    />
  );
};

export default AdminReturns;
