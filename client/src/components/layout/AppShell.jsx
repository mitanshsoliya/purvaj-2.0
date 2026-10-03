import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Store } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import ShopMobileHeader from './ShopMobileHeader';
import MobileBottomNav from './MobileBottomNav';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export const AppShell = ({ role = 'admin' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, switchRole } = useAuth();
  const { cartCount } = useCart();

  const isShop = role === 'shop';

  return (
    <div className="min-h-screen bg-workspace-light dark:bg-workspace-dark text-slate-800 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Banner with Direct Dashboard Switcher */}
      <div className="bg-navy-950 text-slate-300 text-[11px] py-1.5 px-4 font-medium border-b border-navy-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
          <span className="font-bold text-white tracking-wide">PURVAJ 2.0</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 hidden sm:inline">Central Warehouse Hub</span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-brand-400 font-semibold uppercase">{isShop ? 'Shop Retail Portal' : 'Admin Control Hub'}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isShop) {
              switchRole('admin');
              navigate('/admin');
            } else {
              switchRole('shop');
              navigate('/shop');
            }
          }}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-500/20 hover:bg-brand-500/40 text-brand-300 border border-brand-500/40 transition-all hover:scale-[1.02]"
        >
          {isShop ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
              <span>Switch to Admin Dashboard →</span>
            </>
          ) : (
            <>
              <Store className="w-3.5 h-3.5 text-brand-400" />
              <span>Switch to Shop Portal →</span>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          role={role}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Header */}
          {isShop ? (
            <>
              {/* Dedicated mobile-first header on mobile screens */}
              <ShopMobileHeader />
              {/* Standard full header on lg screens */}
              <div className="hidden lg:block">
                <Header
                  onToggleSidebar={() => setCollapsed(!collapsed)}
                  isShopPortal={true}
                  searchPlaceholder="Search wholesale products, brands, past orders..."
                />
              </div>
            </>
          ) : (
            <Header
              onToggleSidebar={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileOpen(true);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              isShopPortal={false}
              searchPlaceholder="Search products, orders, retailers, invoices..."
            />
          )}

          {/* Page Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>

          {/* Mobile Bottom Navigation for Shop */}
          {isShop && <MobileBottomNav cartCount={cartCount} />}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
