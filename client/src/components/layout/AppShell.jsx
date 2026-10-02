import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ShopMobileHeader from './ShopMobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { useAuth } from '../../context/AuthContext';

export const AppShell = ({ role = 'admin' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const isShop = role === 'shop';

  return (
    <div className="min-h-screen bg-workspace-light dark:bg-workspace-dark text-slate-800 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Banner on Dev / Test environment */}
      <div className="bg-navy-950 text-slate-300 text-[11px] py-1 px-4 text-center font-medium border-b border-navy-800 flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
        <span>PURVAJ 2.0 WHOLESALE SUITE</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400">Main Central Warehouse Hub</span>
        <span className="text-slate-500">•</span>
        <span className="text-brand-400 font-semibold uppercase">{isShop ? 'Shop Portal' : 'Admin Control'}</span>
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
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation for Shop */}
          {isShop && <MobileBottomNav cartCount={0} />}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
