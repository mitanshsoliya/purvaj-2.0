import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopOffers = () => {
  return (
    <ModulePlaceholder
      title="Exclusive Wholesale Offers"
      category="Promotions & Deals"
      description="Access tiered bulk discounts, brand incentives, buy-X-get-Y schemes, and seasonal festival offers curated for your retail shop."
      plannedPhase="Phase 8 Promotions & Loyalty"
      apiEndpoint="/api/shop/offers"
      dbTable="public.offers (Active Retailer Schemes)"
      features={[
        'Exclusive wholesale tier deals unlocked by order volume',
        'Manufacturer sponsored brand discounts',
        '1-Click apply schemes directly to your wholesale cart',
      ]}
    />
  );
};

export default ShopOffers;
