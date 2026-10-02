import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopNotifications = () => {
  return (
    <ModulePlaceholder
      title="Shop Notifications & Broadcasts"
      category="Communication"
      description="View updates on order dispatch, invoice approvals, new wholesale stock arrivals, and promotional scheme announcements."
      plannedPhase="Phase 11 Communication Hub"
      apiEndpoint="/api/shop/notifications"
      dbTable="public.notifications (Shop Scoped)"
      features={[
        'Real-time order stage update alerts',
        'Wholesale price drops and seasonal scheme broadcasts',
        'Warehouse dispatch and vehicle dispatch tracking links',
      ]}
    />
  );
};

export default ShopNotifications;
