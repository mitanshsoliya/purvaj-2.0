import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Store, Lock, Mail, ArrowRight, Warehouse } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-brand-500 selection:text-white">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <BrandLogo showSubtitle={false} className="scale-125" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Wholesale B2B Portal
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center justify-center gap-1.5">
            <Warehouse className="w-3.5 h-3.5 text-brand-500" />
            <span>Central Warehouse Operations Node</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-8 shadow-soft-lg rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {/* Portal Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              className={`
                flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all
                ${
                  activeTab === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-soft-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('shop')}
              className={`
                flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all
                ${
                  activeTab === 'shop'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-soft-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <Store className="w-4 h-4" />
              <span>Shop / Retailer</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={activeTab === 'admin' ? 'Admin Email' : 'Registered Business Email'}
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
                <span>Remember me</span>
              </label>
              <span className="text-brand-600 dark:text-brand-400 hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={loading}
              icon={ArrowRight}
              iconPosition="right"
              className="mt-2"
            >
              Sign In to {activeTab === 'admin' ? 'Purvaj Admin' : 'Shop Dashboard'}
            </Button>
          </form>

          {/* Quick Demo Info note */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg text-left text-[11px] font-mono border border-slate-200/60 dark:border-slate-700/60">
              <div className="font-sans font-semibold text-slate-700 dark:text-slate-200 mb-1">Default Seed Credentials:</div>
              <div className="flex justify-between py-0.5"><span className="text-slate-500">Admin:</span> <span className="font-semibold text-brand-600 dark:text-brand-400">admin@purvaj.com / Purvaj@2026</span></div>
              <div className="flex justify-between py-0.5"><span className="text-slate-500">Shop:</span> <span className="font-semibold text-brand-600 dark:text-brand-400">ramesh@sktraders.com / Purvaj@2026</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
