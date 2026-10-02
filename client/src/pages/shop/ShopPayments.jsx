import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopPayments = () => {
  return (
    <ModulePlaceholder
      title="Payment History & Receipts"
      category="Financials"
      description="View history of payments recorded via NEFT, RTGS, UPI, Cheque, or Cash against your account."
      plannedPhase="Phase 7 Payments & Ledger"
      apiEndpoint="/api/shop/payments"
      dbTable="public.payments (Shop Scoped)"
      features={[
        'Full receipt download with transaction reference numbers',
        'Upload payment slip / screenshot for pending verification',
        'Direct reconciliation against specific tax invoices',
      ]}
    />
  );
};

export default ShopPayments;
