import React, { useState } from 'react';
import {
  Settings, Building2, FileText, Percent, BellRing,
  ShieldCheck, Moon, Sun, Globe, CheckCircle2, Save,
  RefreshCw, Lock, MapPin, Phone, Mail, DollarSign
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export const AdminSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('business'); // 'business' | 'invoice' | 'tax' | 'notifications' | 'security' | 'theme'
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Business Profile state
  const [business, setBusiness] = useState({
    companyName: 'Purvaj Wholesale B2B Distribution',
    tradeName: 'Purvaj Enterprises Pvt. Ltd.',
    gstin: '24AAACP9999P1Z8',
    pan: 'AAACP9999P',
    fssai: '10022021000842',
    phone: '+91 98250 00001',
    email: 'billing@purvaj.com',
    warehouseNode: 'PURVAJ_CENTRAL_01',
    warehouseAddress: 'Plot 42, Central Wholesale Hub, APMC Market Yard, Highway Road, Ahmedabad, Gujarat - 380001',
  });

  // Invoice settings state
  const [invoice, setInvoice] = useState({
    prefix: 'INV-',
    defaultDueDays: 15,
    bankName: 'HDFC Bank Ltd.',
    accountName: 'Purvaj Enterprises Pvt Ltd',
    accountNumber: '50200048192841',
    ifsc: 'HDFC0000123',
    termsNotes: '1. Goods once sold will be accepted for return only within 48 hours for verified transit damage.\n2. Interest @ 18% p.a. will be levied on delayed payments exceeding the agreed credit period.\n3. Subject to Ahmedabad jurisdiction only.',
  });

  // Tax settings state
  const [tax, setTax] = useState({
    defaultTaxRate: 5,
    requireHsn: true,
    gstType: 'Regular (Intra-state CGST+SGST, Inter-state IGST)',
    reverseCharge: false,
  });

  // Notification toggles
  const [notifications, setNotifications] = useState({
    orderPlacedAlert: true,
    lowStockThreshold: 20,
    smsDeliveryOtp: true,
    whatsappInvoicePdf: true,
    emailDailyReport: false,
  });

  // Security
  const [security, setSecurity] = useState({
    sessionTimeoutMins: 120,
    requireOtpForAdmin: false,
    enforceStrongPasswords: true,
  });

  // Localization
  const [language, setLanguage] = useState('en');

  const handleSave = () => {
    setSaving(true);
    setSaveSuccess(false);

    // Save to local storage for demo persistence
    setTimeout(() => {
      localStorage.setItem('purvaj_business_settings', JSON.stringify(business));
      localStorage.setItem('purvaj_invoice_settings', JSON.stringify(invoice));
      localStorage.setItem('purvaj_tax_settings', JSON.stringify(tax));
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  const navTabs = [
    { key: 'business', label: 'Business Profile', icon: Building2 },
    { key: 'invoice', label: 'Invoice & Banking', icon: FileText },
    { key: 'tax', label: 'GST & Tax Settings', icon: Percent },
    { key: 'notifications', label: 'Notification Alerts', icon: BellRing },
    { key: 'security', label: 'Security & Access', icon: ShieldCheck },
    { key: 'theme', label: 'Theme & Language', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Platform & Business Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure legal company credentials, GSTIN registration, invoice numbering, banking, and UI preferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved Successfully
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1">
          <Card className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            {navTabs.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </Card>
        </div>

        {/* Content Panel */}
        <div className="md:col-span-3">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            {/* 1. BUSINESS PROFILE */}
            {activeTab === 'business' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Legal Entity & Wholesale Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">These business details appear on all tax invoices, pack slips, and legal declarations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Company Trading Name</label>
                    <input
                      type="text"
                      value={business.companyName}
                      onChange={(e) => setBusiness({ ...business, companyName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Corporate Registered Name</label>
                    <input
                      type="text"
                      value={business.tradeName}
                      onChange={(e) => setBusiness({ ...business, tradeName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">GSTIN (15 Digits)</label>
                    <input
                      type="text"
                      value={business.gstin}
                      onChange={(e) => setBusiness({ ...business, gstin: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Permanent Account Number (PAN)</label>
                    <input
                      type="text"
                      value={business.pan}
                      onChange={(e) => setBusiness({ ...business, pan: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">FSSAI Food License #</label>
                    <input
                      type="text"
                      value={business.fssai}
                      onChange={(e) => setBusiness({ ...business, fssai: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Central Warehouse Code</label>
                    <input
                      type="text"
                      value={business.warehouseNode}
                      disabled
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Central Warehouse Full Dispatch Address</label>
                  <textarea
                    rows={2}
                    value={business.warehouseAddress}
                    onChange={(e) => setBusiness({ ...business, warehouseAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {/* 2. INVOICE SETTINGS */}
            {activeTab === 'invoice' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Tax Invoice & Bank Settlement Settings</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configure numbering prefixes, default retailer credit days, and bank accounts printed on bills.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Invoice Prefix</label>
                    <input
                      type="text"
                      value={invoice.prefix}
                      onChange={(e) => setInvoice({ ...invoice, prefix: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Default Due Period (Days)</label>
                    <input
                      type="number"
                      value={invoice.defaultDueDays}
                      onChange={(e) => setInvoice({ ...invoice, defaultDueDays: parseInt(e.target.value) || 15 })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={invoice.bankName}
                      onChange={(e) => setInvoice({ ...invoice, bankName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={invoice.accountNumber}
                      onChange={(e) => setInvoice({ ...invoice, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={invoice.ifsc}
                      onChange={(e) => setInvoice({ ...invoice, ifsc: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Terms & Conditions (Printed on Tax Invoice)</label>
                  <textarea
                    rows={4}
                    value={invoice.termsNotes}
                    onChange={(e) => setInvoice({ ...invoice, termsNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* 3. TAX SETTINGS */}
            {activeTab === 'tax' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">GST Compliance & Tax Rules</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Control HSN validation, standard wholesale GST slabs, and tax breakdown formats.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">Mandatory HSN Code Enforcement</div>
                      <div className="text-[11px] text-slate-500">Require all catalog products to have 4-to-8 digit HSN codes before saving.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tax.requireHsn}
                      onChange={(e) => setTax({ ...tax, requireHsn: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-white">GST Scheme Type</label>
                    <select
                      value={tax.gstType}
                      onChange={(e) => setTax({ ...tax, gstType: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="Regular (Intra-state CGST+SGST, Inter-state IGST)">Regular (Intra-state CGST+SGST, Inter-state IGST)</option>
                      <option value="Composition Scheme">Composition Scheme</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. NOTIFICATION SETTINGS */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Automated System Alerts</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configure automated notification triggers for warehouse staff and retailer shops.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">Instant Order Placement Push</div>
                      <div className="text-[11px] text-slate-500">Notify admin dashboard immediately when a retailer places a bulk order.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.orderPlacedAlert}
                      onChange={(e) => setNotifications({ ...notifications, orderPlacedAlert: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">Delivery OTP SMS Dispatch</div>
                      <div className="text-[11px] text-slate-500">Send 4-digit confirmation OTP to retailer mobile upon driver departure.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.smsDeliveryOtp}
                      onChange={(e) => setNotifications({ ...notifications, smsDeliveryOtp: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">WhatsApp Invoice PDF Sharing</div>
                      <div className="text-[11px] text-slate-500">Allow instant download and WhatsApp share link for generated GST invoices.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.whatsappInvoicePdf}
                      onChange={(e) => setNotifications({ ...notifications, whatsappInvoicePdf: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. SECURITY & ACCESS */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Access Security & Session Policies</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage token expiration limits, JWT validation parameters, and strong password rules.</p>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <label className="block text-xs font-semibold text-slate-900 dark:text-white">Admin Session Inactivity Timeout (Minutes)</label>
                    <input
                      type="number"
                      value={security.sessionTimeoutMins}
                      onChange={(e) => setSecurity({ ...security, sessionTimeoutMins: parseInt(e.target.value) || 120 })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">Enforce Strong Retailer Passwords</div>
                      <div className="text-[11px] text-slate-500">Requires minimum 6 characters with letters and numbers for shop owners.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={security.enforceStrongPasswords}
                      onChange={(e) => setSecurity({ ...security, enforceStrongPasswords: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. THEME & LOCALIZATION */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Theme & Regional Localization</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Toggle interface dark mode and select regional wholesale platform language.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                    <div className="text-xs font-bold uppercase text-slate-500">Interface Appearance</div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant={theme === 'light' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => theme !== 'light' && toggleTheme()}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Sun className="w-4 h-4" /> Light Mode
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => theme !== 'dark' && toggleTheme()}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <Moon className="w-4 h-4" /> Dark Mode
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                    <div className="text-xs font-bold uppercase text-slate-500">Regional Language</div>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="en">English (Default)</option>
                      <option value="gu">ગુજરાતી (Gujarati)</option>
                      <option value="hi">हिन्दी (Hindi)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
