import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  Store, 
  Lock, 
  Mail, 
  ArrowRight, 
  Warehouse, 
  CheckCircle2, 
  TrendingUp, 
  FileText, 
  CreditCard 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../../components/layout/BrandLogo';
import ThemeToggle from '../../components/layout/ThemeToggle';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'shop'
  const [email, setEmail] = useState('admin@purvaj.com');
  const [password, setPassword] = useState('Purvaj@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTabChange = (role) => {
    setActiveTab(role);
    setError('');
    if (role === 'admin') {
      setEmail('admin@purvaj.com');
      setPassword('Purvaj@2026');
    } else {
      setEmail('ramesh@sktraders.com');
      setPassword('Purvaj@2026');
    }
  };

  const fillQuickAccount = (role, userEmail) => {
    setActiveTab(role);
    setEmail(userEmail);
    setPassword('Purvaj@2026');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login({ email, password, role: activeTab });
      if (res.success) {
        const from = location.state?.from?.pathname;
        if (from && (activeTab === 'admin' ? from.startsWith('/admin') : from.startsWith('/shop'))) {
          navigate(from, { replace: true });
        } else {
          navigate(activeTab === 'admin' ? '/admin' : '/shop', { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-workspace-dark flex flex-col lg:flex-row relative selection:bg-brand-500 selection:text-white">
      {/* Absolute theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Left Feature Showcase (Desktop lg+) */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background gradient accents */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <BrandLogo variant="dark" />
          <div className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-navy-800/80 border border-navy-700/80 text-xs font-semibold text-brand-300">
            <Warehouse className="w-3.5 h-3.5 text-brand-400" />
            <span>Central Warehouse Dispatch Hub</span>
          </div>
        </div>

        {/* Center Presentation */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-lg">
          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Enterprise B2B Wholesale Ordering & Logistics
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Streamline multi-tier retail orders, live inventory allocation, automated GST invoicing, and real-time ledger accounting from a centralized hub.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-navy-850/80 border border-navy-750 backdrop-blur-xs space-y-1.5 shadow-soft-2xs">
              <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 w-fit">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tiered Pricing</h4>
              <p className="text-[11px] text-slate-400">Dynamic wholesale tiers and bulk order discounts</p>
            </div>

            <div className="p-4 rounded-xl bg-navy-850/80 border border-navy-750 backdrop-blur-xs space-y-1.5 shadow-soft-2xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit">
                <CreditCard className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Credit Ledger</h4>
              <p className="text-[11px] text-slate-400">Udhaar balance control & payment tracking</p>
            </div>
          </div>
        </div>

        {/* Bottom Status Footer */}
        <div className="relative z-10 pt-6 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Warehouse Node: 100% Operational</span>
          </div>
          <span className="font-mono text-[11px]">Purvaj Platform v2.0</span>
        </div>
      </div>

      {/* Right Login Form Side */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16 xl:px-24">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Mobile Logo display */}
          <div className="lg:hidden text-center">
            <div className="inline-flex justify-center mb-3">
              <BrandLogo showSubtitle={false} className="scale-110" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              B2B Wholesale Portal
            </h2>
          </div>

          {/* Form Header */}
          <div className="text-left space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sign in to manage inventory, wholesale orders, and store operations
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className={`
                flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-150
                ${
                  activeTab === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-soft-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Hub</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('shop')}
              className={`
                flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all duration-150
                ${
                  activeTab === 'shop'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-soft-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <Store className="w-4 h-4" />
              <span>Shop Retailer</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={activeTab === 'admin' ? 'Administrator Email' : 'Retailer Business Email'}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              placeholder="name@business.com"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              placeholder="••••••••"
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Keep me signed in</span>
              </label>
              <span className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-medium">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
              icon={ArrowRight}
              iconPosition="right"
              className="mt-3"
            >
              Sign In to {activeTab === 'admin' ? 'Admin Hub' : 'Shop Portal'}
            </Button>
          </form>

          {/* Quick 1-click Demo Account Fillers */}
          <div className="pt-5 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">
              Quick 1-Click Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('admin', 'admin@purvaj.com')}
                className="p-2 text-left rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 hover:border-brand-500 transition-colors shadow-soft-2xs group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>Admin Hub</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">admin@purvaj.com</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickAccount('shop', 'ramesh@sktraders.com')}
                className="p-2 text-left rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 hover:border-brand-500 transition-colors shadow-soft-2xs group"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600">
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Shop Retailer</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">ramesh@sktraders.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
