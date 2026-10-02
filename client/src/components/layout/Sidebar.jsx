import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Package,
  Tags,
  BadgePercent,
  Warehouse,
  Boxes,
  ArrowDownToLine,
  Sliders,
  History,
  AlertTriangle,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Cog,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  FileText,
  FilePlus,
  Receipt,
  Store,
  UserCheck,
  UserX,
  Users,
  CreditCard,
  AlertOctagon,
  Scale,
  Gift,
  Send,
  BellRing,
  BarChart3,
  ShieldAlert,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  User,
  Zap,
  Repeat,
  DollarSign
} from 'lucide-react';
import BrandLogo from './BrandLogo';

export const Sidebar = ({
  role = 'admin',
  collapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const location = useLocation();
  const [openSubmenus, setOpenSubmenus] = useState(() => {
    // Auto-open sections based on current path
    const path = location.pathname;
    return {
      catalog: path.includes('/products') || path.includes('/categories') || path.includes('/brands') || path.includes('/pricing'),
      inventory: path.includes('/inventory'),
      orders: path.includes('/orders'),
      billing: path.includes('/billing'),
      shops: path.includes('/shops'),
      payments: path.includes('/payments'),
      communication: path.includes('/communication'),
    };
  });

  const toggleSubmenu = (key) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const adminMenuGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, exact: true },
      ],
    },
    {
      title: 'CATALOG & STOCK',
      items: [
        {
          key: 'catalog',
          label: 'Catalog',
          icon: Layers,
          children: [
            { label: 'Products', to: '/admin/products', icon: Package },
            { label: 'Categories', to: '/admin/categories', icon: Tags },
            { label: 'Brands', to: '/admin/brands', icon: Tags },
            { label: 'Pricing Rules', to: '/admin/pricing', icon: BadgePercent },
          ],
        },
        {
          key: 'inventory',
          label: 'Inventory',
          icon: Warehouse,
          children: [
            { label: 'Current Stock', to: '/admin/inventory', icon: Boxes },
            { label: 'Stock In', to: '/admin/inventory/stock-in', icon: ArrowDownToLine },
            { label: 'Stock Adjustment', to: '/admin/inventory/adjustment', icon: Sliders },
            { label: 'Stock History', to: '/admin/inventory/history', icon: History },
            { label: 'Low Stock Alerts', to: '/admin/inventory/low-stock', icon: AlertTriangle },
          ],
        },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        {
          key: 'orders',
          label: 'Orders',
          icon: ShoppingCart,
          children: [
            { label: 'All Orders', to: '/admin/orders', icon: ShoppingCart },
            { label: 'Pending', to: '/admin/orders/pending', icon: Clock },
            { label: 'Confirmed', to: '/admin/orders/confirmed', icon: CheckCircle2 },
            { label: 'Processing', to: '/admin/orders/processing', icon: Cog },
            { label: 'Dispatched', to: '/admin/orders/dispatched', icon: Truck },
            { label: 'Delivered', to: '/admin/orders/delivered', icon: PackageCheck },
            { label: 'Cancelled', to: '/admin/orders/cancelled', icon: XCircle },
            { label: 'Returns', to: '/admin/orders/returns', icon: RotateCcw },
          ],
        },
        {
          key: 'billing',
          label: 'Billing',
          icon: FileText,
          children: [
            { label: 'Invoices', to: '/admin/billing', icon: FileText },
            { label: 'Create Invoice', to: '/admin/billing/create', icon: FilePlus },
            { label: 'Payment Receipts', to: '/admin/billing/receipts', icon: Receipt },
          ],
        },
        {
          key: 'shops',
          label: 'Shops & Retailers',
          icon: Store,
          children: [
            { label: 'All Shops', to: '/admin/shops', icon: Store },
            { label: 'Pending Approval', to: '/admin/shops/pending', icon: UserCheck },
            { label: 'Active Shops', to: '/admin/shops/active', icon: Store },
            { label: 'Blocked Shops', to: '/admin/shops/blocked', icon: UserX },
            { label: 'Shop Groups', to: '/admin/shops/groups', icon: Users },
          ],
        },
        {
          key: 'payments',
          label: 'Payments & Ledger',
          icon: CreditCard,
          children: [
            { label: 'Payments', to: '/admin/payments', icon: CreditCard },
            { label: 'Outstanding Balance', to: '/admin/payments/outstanding', icon: AlertOctagon },
            { label: 'Credit / Udhaar', to: '/admin/payments/credit', icon: Scale },
            { label: 'Payment History', to: '/admin/payments/history', icon: History },
          ],
        },
      ],
    },
    {
      title: 'COMMUNICATION & LOGISTICS',
      items: [
        { label: 'Offers & Discounts', to: '/admin/offers', icon: Gift },
        { label: 'Returns & Replacement', to: '/admin/returns', icon: RotateCcw },
        { label: 'Delivery Tracking', to: '/admin/delivery', icon: Truck },
        {
          key: 'communication',
          label: 'Communication',
          icon: Send,
          children: [
            { label: 'Broadcast Center', to: '/admin/communication', icon: Send },
            { label: 'Notifications', to: '/admin/communication/notifications', icon: BellRing },
            { label: 'Message History', to: '/admin/communication/history', icon: History },
          ],
        },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { label: 'Reports & Analytics', to: '/admin/reports', icon: BarChart3 },
        { label: 'Staff & Permissions', to: '/admin/staff', icon: ShieldAlert },
        { label: 'Platform Settings', to: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const shopMenuItems = [
    {
      title: 'SHOP PORTAL',
      items: [
        { label: 'Dashboard', to: '/shop', icon: LayoutDashboard, exact: true },
        { label: 'Wholesale Products', to: '/shop/products', icon: Package },
        { label: 'Quick Bulk Order', to: '/shop/quick-order', icon: Zap },
        { label: 'Wholesale Cart', to: '/shop/cart', icon: ShoppingCart },
        { label: 'My Orders', to: '/shop/orders', icon: ShoppingCart },
        { label: 'Quick Reorder', to: '/shop/reorder', icon: Repeat },
        { label: 'Invoices & Bills', to: '/shop/bills', icon: FileText },
        { label: 'Payment History', to: '/shop/payments', icon: DollarSign },
        { label: 'Outstanding Ledger', to: '/shop/outstanding', icon: Scale },
        { label: 'Notifications', to: '/shop/notifications', icon: BellRing },
        { label: 'Exclusive Offers', to: '/shop/offers', icon: Gift },
        { label: 'Shop Profile', to: '/shop/profile', icon: User },
        { label: 'Help & Support', to: '/shop/help', icon: HelpCircle },
      ],
    },
  ];

  const menuGroups = role === 'admin' ? adminMenuGroups : shopMenuItems;

  const sidebarContent = (
    <aside
      className={`
        h-full bg-navy-900 text-slate-300 flex flex-col border-r border-navy-800
        transition-all duration-300 select-none
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-navy-800/80 flex-shrink-0">
        <BrandLogo
          collapsed={collapsed}
          to={role === 'admin' ? '/admin' : '/shop'}
          variant="dark"
        />
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-6 scrollbar-thin">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!collapsed && group.title && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 mb-1.5">
                {group.title}
              </p>
            )}

            {group.items.map((item) => {
              if (item.children) {
                const isOpen = openSubmenus[item.key];
                const hasActiveChild = item.children.some((child) =>
                  location.pathname === child.to || location.pathname.startsWith(`${child.to}/`)
                );
                const ParentIcon = item.icon;

                return (
                  <div key={item.key} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleSubmenu(item.key)}
                      title={collapsed ? item.label : undefined}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold
                        transition-all duration-150 group
                        ${
                          hasActiveChild
                            ? 'text-white bg-navy-800/70'
                            : 'text-slate-300 hover:text-white hover:bg-navy-800/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <ParentIcon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            hasActiveChild ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        {!collapsed && <span>{item.label}</span>}
                      </div>
                      {!collapsed && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            isOpen ? 'transform rotate-180 text-brand-400' : ''
                          }`}
                        />
                      )}
                    </button>

                    {!collapsed && isOpen && (
                      <div className="pl-6 pr-1 py-1 space-y-1 border-l border-navy-800 ml-4">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={onCloseMobile}
                              className={({ isActive }) => `
                                flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium
                                transition-colors
                                ${
                                  isActive
                                    ? 'bg-brand-600 text-white font-semibold shadow-soft-sm'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/40'
                                }
                              `}
                            >
                              <ChildIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
                              <span>{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => `
                    flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold
                    transition-all duration-150 group
                    ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-soft-sm'
                        : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0 transition-colors" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Warehouse Status Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-navy-800/80 bg-navy-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-300">Central Hub Online</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">v2.0.0</span>
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] z-10 shadow-soft-lg">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
