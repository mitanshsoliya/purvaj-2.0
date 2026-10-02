import React, { useState } from 'react';
import { Bell, Search, User, LogOut, ArrowLeftRight, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import SearchBar from '../common/SearchBar';

export const ShopMobileHeader = ({ onSearchClick }) => {
  const { user, switchRole, logout } = useAuth();
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Shop Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo showSubtitle={false} to="/shop" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[200px]">
              {user?.shopName || 'Retail Portal'}
            </span>
            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">
              GST: {user?.gstin || '24AAACP1234M1Z2'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle mobile search"
          >
            <Search className="w-4 h-4" />
          </button>

          <ThemeToggle />

          <button
            type="button"
            onClick={() => setShowProfileModal(!showProfileModal)}
            className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs"
            aria-label="Shop profile"
          >
            <Store className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Mobile Search bar */}
      {showSearch && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80">
          <SearchBar
            value={query}
            onChange={setQuery}
            autoFocus
            placeholder="Search wholesale products, SKU..."
          />
        </div>
      )}

      {/* Quick Profile Dropdown for Mobile */}
      {showProfileModal && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/50" onClick={() => setShowProfileModal(false)} />
          <div className="absolute right-3 top-14 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-lg z-50 p-4 space-y-3">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user?.shopName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Contact: {user?.name}
              </p>
            </div>
            <button
              onClick={() => {
                setShowProfileModal(false);
                switchRole('admin');
              }}
              className="w-full text-left text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 py-1.5 hover:text-brand-600"
            >
              <ArrowLeftRight className="w-4 h-4 text-brand-500" />
              Switch to Admin Dashboard
            </button>
            <button
              onClick={() => {
                setShowProfileModal(false);
                logout();
              }}
              className="w-full text-left text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 py-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </header>
  );
};

export default ShopMobileHeader;
