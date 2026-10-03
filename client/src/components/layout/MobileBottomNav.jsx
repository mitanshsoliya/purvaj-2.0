import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Package,
  ShoppingCart,
  ShoppingBag,
  MoreHorizontal,
  Zap,
  Repeat,
  FileText,
  DollarSign,
  Scale,
  Gift,
  User,
  HelpCircle,
  BellRing
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import Drawer from '../common/Drawer';

export const MobileBottomNav = ({ cartCount = 0 }) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { unreadCount } = useSocket();

  const mainNavItems = [
    { label: 'Home', to: '/shop', icon: Home, exact: true },
    { label: 'Products', to: '/shop/products', icon: Package },
    { label: 'Cart', to: '/shop/cart', icon: ShoppingCart, badge: cartCount },
    { label: 'Orders', to: '/shop/orders', icon: ShoppingBag },
  ];

  const moreItems = [
    { label: 'Notifications', to: '/shop/notifications', icon: BellRing, desc: 'Live announcements & alerts', badge: unreadCount },
    { label: 'Quick Bulk Order', to: '/shop/quick-order', icon: Zap, desc: 'Instant SKU bulk entry' },
    { label: 'Quick Reorder', to: '/shop/reorder', icon: Repeat, desc: 'Order from past invoices' },
    { label: 'Invoices & Bills', to: '/shop/bills', icon: FileText, desc: 'Download tax invoices' },
    { label: 'Payments', to: '/shop/payments', icon: DollarSign, desc: 'History and bank slips' },
    { label: 'Outstanding Ledger', to: '/shop/outstanding', icon: Scale, desc: 'Udhaar balance and statement' },
    { label: 'Exclusive Offers', to: '/shop/offers', icon: Gift, desc: 'Wholesale tiered discounts' },
    { label: 'Shop Profile', to: '/shop/profile', icon: User, desc: 'GST, address, and credit limit' },
    { label: 'Help & Support', to: '/shop/help', icon: HelpCircle, desc: 'Contact warehouse dispatch' },
  ];

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-safe shadow-soft-lg"
      >
        <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => `
                  relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-all duration-200
                  ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute top-0 inset-x-4 h-0.5 bg-brand-600 dark:bg-brand-400 rounded-full" />
                    )}
                    <div className="relative">
                      <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} />
                      {item.badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-brand-600 text-white leading-tight shadow-soft-2xs">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            aria-label="Open more menu"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* Drawer for More items */}
      <Drawer
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title="Purvaj 2.0 Retail Services"
        subtitle="Quick wholesale tools & account management"
        position="right"
      >
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center gap-3.5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2.5 -mx-2.5 transition-colors group"
              >
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-950/60 dark:group-hover:text-brand-400 transition-colors shadow-soft-2xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {item.label}
                    </p>
                    {item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {item.desc}
                  </p>
                </div>
              </NavLink>
            );
          })}
        </div>
      </Drawer>
    </>
  );
};

export default MobileBottomNav;
