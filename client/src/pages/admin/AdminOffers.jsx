import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminOffers = () => {
  return (
    <ModulePlaceholder
      title="Offers & Promotional Schemes"
      category="Marketing & Promotions"
      description="Configure wholesale scheme discounts, brand promotions, volume buy-X-get-Y deals, and coupon codes."
      plannedPhase="Phase 8 Promotions & Loyalty"
      apiEndpoint="/api/admin/offers"
      dbTable="public.offers, public.scheme_rules"
      features={[
        'Buy X Get Y wholesale free goods schemes',
        'Seasonal percentage slab promotions',
        'Targeted retailer promotions by region / shop group',
        'Offer validity countdown timer in shop dashboard',
      ]}
    />
  );
};

export default AdminOffers;
