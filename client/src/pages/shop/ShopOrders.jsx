import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopOrders = () => {
  return (
    <ModulePlaceholder
      title="My Wholesale Orders"
      category="Order Tracking"
      description="Track past and current wholesale orders placed with Purvaj Central Warehouse with live dispatch tracking and invoice access."
      plannedPhase="Phase 4 Order Tracking"
      apiEndpoint="/api/shop/orders"
      dbTable="public.orders (Shop Filtered View)"
      features={[
        'Live order status timeline (Pending -> Packing -> Out for Delivery -> Delivered)',
        '1-Click Reorder of any previous order items',
        'Download official signed invoice PDF',
        'Raise return / damage claims with photo upload',
      ]}
    />
  );
};

export default ShopOrders;
