import React from 'react';
import { useLocation } from 'react-router-dom';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminOrders = () => {
  const location = useLocation();
  const path = location.pathname;

  let filterStatus = 'All Orders';
  if (path.includes('pending')) filterStatus = 'Pending Approval';
  else if (path.includes('confirmed')) filterStatus = 'Confirmed Orders';
  else if (path.includes('processing')) filterStatus = 'Processing & Packing';
  else if (path.includes('dispatched')) filterStatus = 'Dispatched / In-Transit';
  else if (path.includes('delivered')) filterStatus = 'Delivered Orders';
  else if (path.includes('cancelled')) filterStatus = 'Cancelled Orders';
  else if (path.includes('returns')) filterStatus = 'Order Returns';

  return (
    <ModulePlaceholder
      title={`Wholesale Orders (${filterStatus})`}
      category="Order Fulfillment"
      description="Process wholesale retailer orders, allocate warehouse inventory, generate pick-lists, and manage dispatch manifests."
      plannedPhase="Phase 4 Order Management & Fulfillment"
      apiEndpoint="/api/admin/orders"
      dbTable="public.orders, public.order_items, public.order_status_logs"
      features={[
        'Full B2B wholesale order lifecycle (Pending -> Confirmed -> Packing -> Dispatched -> Delivered)',
        'Warehouse Pick-List & Pack-Slip generation',
        'Automatic credit limit & outstanding balance validation prior to confirmation',
        'Real-time status broadcasts to shop portal via Socket.IO',
        'Bulk order CSV export for logistics partners',
      ]}
    />
  );
};

export default AdminOrders;
