import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ShopMobileHeader from './ShopMobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { useCart } from '../../context/CartContext';

export const AppShell = ({ role = 'admin' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { cartCount } = useCart();

  const isShop = role === 'shop';

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-workspace-dark text-slate-800 dark:text-slate-100 flex flex-col antialiased">
      <div className="flex flex-1 overflow-hidden relative min-h-screen">
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
          {/* Top Header */}
          {isShop ? (
            <>
              {/* Dedicated mobile header */}
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
          {isShop && <MobileBottomNav cartCount={cartCount} />}
        </div>
      </div>
    </div>
  );
};

export default AppShell;
