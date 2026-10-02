import React from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { Phone, Mail, MessageSquare, Clock, MapPin, Warehouse } from 'lucide-react';

export const ShopHelp = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-soft">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Help & Wholesale Support
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Direct assistance from the Purvaj 2.0 Central Warehouse Operations & Dispatch Desk.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Warehouse Dispatch Desk" subtitle="Direct contact for order inquiries">
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Dispatch Helpline</p>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">+91 (Wholesale Desk Hotline)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Billing & Support Email</p>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">support@purvaj.com</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Operating Hours</p>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">Mon - Sat: 9:00 AM - 8:00 PM</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Central Hub Location" subtitle="Single main warehouse location">
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2.5">
              <Warehouse className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Purvaj Central Warehouse</span>
                <p className="mt-0.5">Plot No. 42-45, Industrial Wholesale Logistics Park</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Important Delivery Note:</span> All orders confirmed before 2:00 PM are dispatched same-day on standard wholesale delivery routes.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShopHelp;
