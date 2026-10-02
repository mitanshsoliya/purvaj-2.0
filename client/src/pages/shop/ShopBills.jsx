import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopBills = () => {
  return (
    <ModulePlaceholder
      title="My Wholesale Bills & Invoices"
      category="Invoices & Taxation"
      description="View and download all official GST tax invoices, delivery challans, and credit notes issued by Purvaj."
      plannedPhase="Phase 5 Billing & Tax Documents"
      apiEndpoint="/api/shop/invoices"
      dbTable="public.invoices (Shop Scoped)"
      features={[
        'Download GST compliant PDF tax invoices',
        'Filter by date range and payment status (Paid, Unpaid, Partial)',
        'Detailed HSN tax rate breakdown for monthly accounting',
      ]}
    />
  );
};

export default ShopBills;
