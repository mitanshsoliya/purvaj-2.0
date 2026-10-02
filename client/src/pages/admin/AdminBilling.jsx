import React from 'react';
import { useLocation } from 'react-router-dom';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminBilling = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Billing & Tax Invoices';
  if (path.includes('create')) title = 'Create Tax Invoice';
  else if (path.includes('receipts')) title = 'Payment Receipts';

  return (
    <ModulePlaceholder
      title={title}
      category="Billing & Invoicing"
      description="Generate GST-compliant tax invoices, e-Way bills, credit notes, and official payment receipts for wholesale transactions."
      plannedPhase="Phase 5 Billing & Invoicing Engine"
      apiEndpoint="/api/admin/invoices"
      dbTable="public.invoices, public.invoice_items, public.tax_slabs"
      features={[
        'Automated GST calculation (CGST + SGST or IGST)',
        'HSN summary table per tax invoice',
        'Printable wholesale invoice PDF generation',
        'Direct link to shop outstanding ledger',
      ]}
    />
  );
};

export default AdminBilling;
