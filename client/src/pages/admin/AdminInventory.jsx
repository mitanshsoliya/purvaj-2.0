import React from 'react';
import { useLocation } from 'react-router-dom';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminInventory = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = 'Central Warehouse Inventory';
  let section = 'Current Stock';
  if (path.includes('stock-in')) {
    title = 'Warehouse Stock Inward';
    section = 'Inbound Shipments';
  } else if (path.includes('adjustment')) {
    title = 'Inventory Adjustments';
    section = 'Stock Reconciliation';
  } else if (path.includes('history')) {
    title = 'Stock Ledger & Movement History';
    section = 'Audit Trail';
  } else if (path.includes('low-stock')) {
    title = 'Low Stock & Reorder Triggers';
    section = 'Replenishment Alerts';
  }

  return (
    <ModulePlaceholder
      title={title}
      category={`Inventory (${section})`}
      description="Real-time central warehouse stock monitoring, lot numbers, batch expiry, inward GRN creation, and low stock replenishment triggers."
      plannedPhase="Phase 3 Inventory & Warehouse Operations"
      apiEndpoint="/api/admin/inventory"
      dbTable="public.inventory_lots, public.stock_movements, public.warehouse_bins"
      features={[
        'Strict Single-Warehouse Stock Accounting (Purvaj Central Node)',
        'GRN (Goods Receipt Note) creation with PO matching',
        'Batch/Lot tracking with expiry threshold alerts',
        'Damage / discrepancy inventory adjustments with manager sign-off',
        'Auto-replenishment warnings for high velocity wholesale items',
      ]}
    />
  );
};

export default AdminInventory;
