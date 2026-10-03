import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, LogOut, ArrowLeftRight, Store, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import SearchBar from '../common/SearchBar';

export const ShopMobileHeader = ({ onSearchClick }) => {
  const navigate = useNavigate();
  const { user, switchRole, logout } = useAuth();
  const { cartCount } = useCart();
  const { unreadCount } = useSocket();
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [query, setQuery] = useState('');

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Shop Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo showSubtitle={false} to="/shop" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[200px]">
              {user?.shopName || 'Retail Portal'}
            </span>
            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold truncate">
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

          <button
            type="button"
            onClick={() => navigate('/shop/notifications')}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-rose-500 text-white flex items-center justify-center leading-none shadow-sm animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/shop/cart')}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            aria-label="Cart"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-brand-600 text-white leading-tight shadow-soft-2xs">
                {cartCount}
              </span>
            )}
          </button>

          <ThemeToggle />

          <button
            type="button"
            onClick={() => setShowProfileModal(!showProfileModal)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center font-bold text-xs shadow-soft-2xs"
            aria-label="Shop profile"
          >
            <Store className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Mobile Search bar */}
      {showSearch && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850/90 animate-slide-down">
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
          <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs" onClick={() => setShowProfileModal(false)} />
          <div className="absolute right-3 top-14 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-xl z-50 p-4 space-y-3 animate-slide-down">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user?.shopName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Contact: {user?.name}
              </p>
            </div>
            <button
              onClick={() => {
                setShowProfileModal(false);
                switchRole('admin');
                navigate('/admin');
              }}
              className="w-full text-left text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-2 py-2 px-2.5 rounded-lg bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-brand-500" />
              Open Admin Dashboard
            </button>
            <button
              onClick={() => {
                setShowProfileModal(false);
                logout();
              }}
              className="w-full text-left text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-2 py-1.5 px-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
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
