import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopQuickOrder = () => {
  return (
    <ModulePlaceholder
      title="Quick Bulk Order"
      category="B2B Speed Ordering"
      description="Rapid order entry tool tailored for retail shop owners to type SKUs, barcode numbers, or item names directly into an order sheet."
      plannedPhase="Phase 2 / Phase 4 B2B Ordering"
      apiEndpoint="/api/shop/quick-order"
      dbTable="public.order_drafts"
      features={[
        'Spreadsheet-style multi-item rapid entry',
        'Barcode scanner support via mobile camera',
        'Direct paste from Excel or CSV order lists',
        'Instant stock reservation check before cart checkout',
      ]}
    />
  );
};

export default ShopQuickOrder;
