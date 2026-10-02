import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopOutstanding = () => {
  return (
    <ModulePlaceholder
      title="Outstanding Balance & Udhaar Ledger"
      category="Credit & Ledger"
      description="Transparent accounting statement showing total credit limit, current outstanding balance, invoice debits, and payment credits."
      plannedPhase="Phase 7 Credit & Udhaar Ledger"
      apiEndpoint="/api/shop/ledger"
      dbTable="public.ledger_entries (Shop Scoped)"
      features={[
        'Full statement statement export in PDF and Excel format',
        'Credit limit utilization gauge and available balance',
        'Invoice due-date reminders to prevent account blocking',
      ]}
    />
  );
};

export default ShopOutstanding;
