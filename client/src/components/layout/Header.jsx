import React, { useState } from 'react';
import { 
  Bell, 
  Menu, 
  User, 
  LogOut, 
  Building2, 
  ShieldCheck, 
  ArrowLeftRight, 
  Store,
  Warehouse,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import SearchBar from '../common/SearchBar';
import DateRangeSelector from './DateRangeSelector';
import Breadcrumbs from './Breadcrumbs';

export const Header = ({
  onToggleSidebar,
  showDateRange = true,
  searchPlaceholder = 'Search Purvaj 2.0...',
  isShopPortal = false,
}) => {
  const { user, isAdmin, isShop, logout, switchRole } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const notifications = [
    {
      id: 1,
      title: 'Central Warehouse Stock Sync',
      desc: 'Stock counts for main warehouse updated.',
      time: '10m ago',
      read: false,
    },
    {
      id: 2,
      title: 'New B2B Order #ORD-2026-089',
      desc: 'Shree Krishna Traders placed wholesale order.',
      time: '1h ago',
      read: false,
    },
    {
      id: 3,
      title: 'GST Compliance Updated',
      desc: 'Tax breakdown ready for monthly billing.',
      time: '3h ago',
      read: true,
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left Section: Mobile Menu + Breadcrumbs / Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-ring"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden md:flex flex-col">
            <Breadcrumbs />
          </div>

          {/* Single Warehouse Indicator Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Warehouse className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Central Warehouse</span>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="hidden md:block flex-1 max-w-md mx-4">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            placeholder={searchPlaceholder}
            showShortcut={true}
          />
        </div>

        {/* Right Section: Actions + Profile */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Admin Date Range */}
          {showDateRange && !isShopPortal && (
            <div className="hidden xl:block">
              <DateRangeSelector />
            </div>
          )}

          {/* Quick Demo Switcher */}
          <button
            type="button"
            onClick={() => switchRole(isAdmin ? 'shop' : 'admin')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-brand-500 transition-colors"
            title="Switch between Admin & Shop Dashboard"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-brand-500" />
            <span>{isAdmin ? 'View as Shop' : 'View as Admin'}</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-ring"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-lg z-40 py-2 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Notifications
                    </span>
                    <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold cursor-pointer hover:underline">
                      Mark all read
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                          !n.read ? 'bg-brand-50/30 dark:bg-brand-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {n.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 cursor-pointer hover:underline">
                      View all notifications
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-ring"
              aria-label="User account menu"
            >
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-soft-sm">
                {user?.name ? user.name.slice(0, 2) : 'PJ'}
              </div>
              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[110px] truncate">
                  {user?.shopName || user?.name || 'Purvaj User'}
                </span>
                <span className="text-[10px] font-medium text-slate-400 capitalize mt-0.5">
                  {user?.role === 'admin' ? 'Administrator' : 'Retail Partner'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-lg z-40 py-2 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {user?.shopName || user?.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                        {user?.role === 'admin' ? (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            Admin Console
                          </>
                        ) : (
                          <>
                            <Store className="w-3 h-3" />
                            Retailer ID: {user?.id}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        switchRole(user?.role === 'admin' ? 'shop' : 'admin');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                    >
                      <ArrowLeftRight className="w-4 h-4 text-brand-500" />
                      <span>
                        Switch to {user?.role === 'admin' ? 'Shop Portal' : 'Admin Portal'}
                      </span>
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
