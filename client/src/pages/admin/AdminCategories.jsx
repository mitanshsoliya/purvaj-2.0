import React from 'react';
import ModulePlaceholder from '../../components/common/ModulePlaceholder';

export const AdminCategories = () => {
  return (
    <ModulePlaceholder
      title="Category Hierarchy"
      category="Catalog Management"
      description="Define category trees, sub-categories, visual badges, and catalog taxonomy for wholesale browsing."
      plannedPhase="Phase 2 Catalog Implementation"
      apiEndpoint="/api/admin/categories"
      dbTable="public.categories"
      features={[
        'Multi-level category hierarchy',
        'Custom category icons & banners',
        'Category-level discount defaults',
        'Visibility controls for shop portal',
      ]}
    />
  );
};

export default AdminCategories;
