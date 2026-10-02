import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopReorder = () => {
  return (
    <ModulePlaceholder
      title="Quick Reorder"
      category="Repeat Purchase"
      description="Quickly replenish your store inventory based on your top purchased products and past monthly invoices."
      plannedPhase="Phase 4 Repeat Ordering"
      apiEndpoint="/api/shop/reorder"
      dbTable="public.frequent_order_items"
      features={[
        'Frequently ordered items list with last purchased prices',
        'Bulk replenishment with 1-click cart addition',
        'Out-of-stock item notification alerts',
      ]}
    />
  );
};

export default ShopReorder;
