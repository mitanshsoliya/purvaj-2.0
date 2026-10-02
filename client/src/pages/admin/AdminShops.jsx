import React from 'react';
import { useLocation } from 'react-router-dom';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminShops = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Retailer / Shop Directory';
  if (path.includes('pending')) title = 'Pending Retailer Approvals';
  else if (path.includes('active')) title = 'Active Retail Partners';
  else if (path.includes('blocked')) title = 'Blocked / Suspended Accounts';
  else if (path.includes('groups')) title = 'Retailer Pricing Groups';

  return (
    <ModulePlaceholder
      title={title}
      category="Retail Partner Management"
      description="Review retailer KYC registrations, verify GSTIN, assign credit limits, configure payment terms, and manage shop groups."
      plannedPhase="Phase 6 Retail Partner Management"
      apiEndpoint="/api/admin/shops"
      dbTable="public.shops, public.shop_kyc_documents, public.shop_groups"
      features={[
        'New shop onboarding verification workflow',
        'GSTIN validation and legal business address checks',
        'Credit limit allocation and payment due day configuration',
        'Retailer categorization into tiers (Gold, Silver, Platinum)',
        'Account block / freeze for overdue payments',
      ]}
    />
  );
};

export default AdminShops;
