import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminReports = () => {
  return (
    <ModulePlaceholder
      title="Wholesale Analytics & Reports"
      category="Intelligence & Reporting"
      description="Access sales velocity reports, category performance analysis, dead stock auditing, retailer credit aging, and tax summaries."
      plannedPhase="Phase 12 Analytics & Reporting"
      apiEndpoint="/api/admin/reports"
      dbTable="public.daily_sales_aggregates, public.inventory_snapshots"
      features={[
        'SKU-level gross margin profitability report',
        'Top performing retail shops by order volume & frequency',
        'Slow-moving and dead-stock warehouse auditing',
        'Monthly GSTR-1 sales summary export',
      ]}
    />
  );
};

export default AdminReports;
