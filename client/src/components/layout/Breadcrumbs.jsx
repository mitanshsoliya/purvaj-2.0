import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels = {
  admin: 'Admin',
  products: 'Products',
  categories: 'Categories',
  brands: 'Brands',
  pricing: 'Pricing',
  inventory: 'Inventory',
  orders: 'Orders',
  billing: 'Billing',
  shops: 'Shops',
  payments: 'Payments',
  offers: 'Offers & Discounts',
  returns: 'Returns & Replacement',
  delivery: 'Delivery',
  communication: 'Communication',
  reports: 'Reports',
  staff: 'Staff & Permissions',
  settings: 'Settings',
  shop: 'Shop Portal',
  'quick-order': 'Quick Order',
  cart: 'Wholesale Cart',
  reorder: 'Quick Reorder',
  bills: 'My Bills',
  outstanding: 'Outstanding Ledger',
  notifications: 'Notifications',
  profile: 'Business Profile',
  help: 'Help & Support',
};

export const Breadcrumbs = ({ customItems, className = '' }) => {
  const location = useLocation();

  const pathnames = location.pathname.split('/').filter((x) => x);

  const items = customItems || pathnames.map((segment, index) => {
    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
    const label = routeLabels[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const isLast = index === pathnames.length - 1;
    return { label, to, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <ol className="inline-flex items-center space-x-1.5 md:space-x-2">
        <li className="inline-flex items-center">
          <Link
            to={pathnames[0] === 'shop' ? '/shop' : '/admin'}
            className="inline-flex items-center hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <Home className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Purvaj</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={item.to || index} className="inline-flex items-center">
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 mx-1 flex-shrink-0" />
            {item.isLast ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-none">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors truncate max-w-[120px] sm:max-w-none"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
