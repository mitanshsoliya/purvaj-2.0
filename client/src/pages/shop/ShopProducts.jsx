import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopProducts = () => {
  return (
    <ModulePlaceholder
      title="Wholesale Product Catalog"
      category="Retail Portal"
      description="Browse wholesale goods with carton quantities, volume-tiered discounts, and live central warehouse stock availability."
      plannedPhase="Phase 2 Catalog Integration"
      apiEndpoint="/api/shop/products"
      dbTable="public.products (Wholesale View)"
      features={[
        'Live stock availability from Purvaj Central Warehouse',
        'Transparent wholesale tier pricing (Price per unit & per carton)',
        '1-Click Add to wholesale cart with MOQ validation',
        'Filter by category, brand, and active wholesale promotions',
      ]}
    />
  );
};

export default ShopProducts;
