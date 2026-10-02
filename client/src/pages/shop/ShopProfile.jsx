import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Store, MapPin, FileText, Phone, Mail, ShieldCheck } from 'lucide-react';

export const ShopProfile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-xl shadow-soft">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {user?.shopName || 'Shree Krishna Traders'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Active Retailer
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Retailer Account ID: <span className="font-mono">{user?.id || 'usr_shop_102'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Business Details" subtitle="Verified KYC legal credentials">
          <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-400">Legal Business Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {user?.shopName || 'Shree Krishna Traders'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-400">GSTIN</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {user?.gstin || '24AAACP1234M1Z2'}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-400">Owner / Representative</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {user?.name || 'Ramesh Patel'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Registered Email</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {user?.email || 'sk.traders@purvaj.shop'}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Credit & Financial Terms" subtitle="Approved wholesale trading limit">
          <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-400">Approved Credit Limit</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                ₹2,50,000
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-400">Payment Due Term</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Net 15 Days
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-400">Assigned Warehouse</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                Main Central Warehouse (Purvaj Hub)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Wholesale Tier</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                Gold Retailer Tier
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShopProfile;
