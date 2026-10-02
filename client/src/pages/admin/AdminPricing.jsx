import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminPricing = () => {
  return (
    <ModulePlaceholder
      title="B2B Wholesale Pricing Rules"
      category="Catalog & Pricing"
      description="Configure wholesale tiered pricing, volume slab discounts, retailer-group specific price lists, and cash discount incentives."
      plannedPhase="Phase 2 Pricing & Discounts"
      apiEndpoint="/api/admin/pricing-rules"
      dbTable="public.pricing_rules, public.tier_discounts"
      features={[
        'Volume-based tier discounts (e.g. 10-49 units, 50-99 units, 100+ units)',
        'Retailer category price lists (Silver, Gold, Platinum shops)',
        'Promotional wholesale price override schedules',
        'Automatic margin safety floor constraints',
      ]}
    />
  );
};

export default AdminPricing;
