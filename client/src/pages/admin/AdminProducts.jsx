import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminProducts = () => {
  return (
    <ModulePlaceholder
      title="Wholesale Product Catalog"
      category="Catalog Management"
      description="Manage master products, wholesale unit pricing, carton packaging rules, tax/GST slabs, and product images."
      plannedPhase="Phase 2 Catalog Implementation"
      apiEndpoint="/api/admin/products"
      dbTable="public.products, public.product_variants"
      features={[
        'SKU & Barcode tracking',
        'Bulk product CSV import / export',
        'Carton packaging & minimum order quantity (MOQ)',
        'GST percentage & HSN code classification',
        'Tiered B2B pricing rules',
      ]}
    />
  );
};

export default AdminProducts;
