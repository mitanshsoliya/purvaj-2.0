import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const ShopCart = () => {
  return (
    <ModulePlaceholder
      title="Wholesale Order Cart"
      category="Checkout & Verification"
      description="Review order lines, check carton quantities, apply wholesale promo schemes, verify available credit limit, and submit order."
      plannedPhase="Phase 4 Ordering & Checkout"
      apiEndpoint="/api/shop/cart"
      dbTable="public.cart_items, public.credit_limits"
      features={[
        'Automated Minimum Order Value (MOV) validation',
        'Automatic Udhaar / Credit Limit balance safety check',
        'Transparent GST & freight cost breakdown',
        'Order placement confirmation with instant PDF requisition summary',
      ]}
    />
  );
};

export default ShopCart;
