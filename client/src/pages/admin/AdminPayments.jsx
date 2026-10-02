import React from 'react';
import { useLocation } from 'react-router-dom';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminPayments = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Payment Collections & Reconciliation';
  if (path.includes('outstanding')) title = 'Outstanding Balances';
  else if (path.includes('credit')) title = 'Credit / Udhaar Management';
  else if (path.includes('history')) title = 'Historical Payment Ledger';

  return (
    <ModulePlaceholder
      title={title}
      category="Financials & Ledger"
      description="Track bank NEFT/RTGS/UPI collections, manage retailer Udhaar balances, reconcile partial payments, and manage aging debt schedules."
      plannedPhase="Phase 7 Payment & Credit Ledger"
      apiEndpoint="/api/admin/payments"
      dbTable="public.payments, public.ledger_entries, public.credit_limits"
      features={[
        'Full B2B wholesale double-entry ledger bookkeeping',
        'Udhaar credit aging report (0-15 days, 16-30 days, 30+ days overdue)',
        'Cash receipt and bank transfer reconciliation',
        'Automated overdue SMS / WhatsApp payment reminder hooks',
      ]}
    />
  );
};

export default AdminPayments;
