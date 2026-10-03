import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { PageSkeleton } from '../../components/common/Skeleton';
import {
  Store,
  MapPin,
  FileText,
  Phone,
  Mail,
  ShieldCheck,
  Lock,
  Save,
  KeyRound,
  Bell,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  IndianRupee,
  RefreshCw
} from 'lucide-react';

export const ShopProfile = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Shop details form
  const [formData, setFormData] = useState({
    shop_name: '',
    owner_name: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: 'Gujarat',
    pincode: '',
    gstin: '',
    credit_limit: 250000,
    credit_used: 0,
    available_credit: 250000,
    payment_terms: '15 Days',
    status: 'active',
  });

  // Notification Preferences form
  const [prefData, setPrefData] = useState({
    channel_in_app: true,
    channel_whatsapp: true,
    channel_sms: true,
    order_updates: true,
    payment_reminders: true,
    promotional_offers: true,
  });

  // Password change form
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.allSettled([fetchProfile(), fetchPreferences()]);
    } catch (err) {
      console.error('Failed to load shop profile data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/shops/notification-preferences');
      if (res.data?.success && res.data?.data?.preferences) {
        const p = res.data.data.preferences;
        setPrefData({
          channel_in_app: p.channel_in_app !== undefined ? Boolean(p.channel_in_app) : true,
          channel_whatsapp: p.channel_whatsapp !== undefined ? Boolean(p.channel_whatsapp) : true,
          channel_sms: p.channel_sms !== undefined ? Boolean(p.channel_sms) : true,
          order_updates: p.order_updates !== undefined ? Boolean(p.order_updates) : true,
          payment_reminders: p.payment_reminders !== undefined ? Boolean(p.payment_reminders) : true,
          promotional_offers: p.promotional_offers !== undefined ? Boolean(p.promotional_offers) : true,
        });
      }
    } catch (e) {
      console.warn('Failed to load notification preferences, using defaults', e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/shops/profile');
      if (res.data?.success && res.data?.data?.shop) {
        const s = res.data.data.shop;
        const limit = parseFloat(s.credit_limit || 250000);
        const used = parseFloat(s.credit_used || 0);

        setFormData({
          shop_name: s.shop_name || '',
          owner_name: s.owner_name || s.owner_account_name || user?.name || '',
          mobile: s.mobile || user?.mobile || '',
          email: s.email || s.owner_account_email || user?.email || '',
          address: s.address || '',
          city: s.city || '',
          state: s.state || 'Gujarat',
          pincode: s.pincode || '',
          gstin: s.gstin || '',
          credit_limit: limit,
          credit_used: used,
          available_credit: Math.max(0, limit - used),
          payment_terms: s.payment_terms ? `${s.payment_terms} Days` : '15 Days',
          status: s.status || 'active',
        });
      } else if (user?.shop) {
        const s = user.shop;
        const limit = parseFloat(s.credit_limit || 250000);
        const used = parseFloat(s.credit_used || 0);

        setFormData((prev) => ({
          ...prev,
          shop_name: s.shop_name || user.shopName || '',
          owner_name: user.name || '',
          email: user.email || '',
          mobile: user.mobile || '',
          city: s.city || '',
          gstin: s.gstin || user.gstin || '',
          credit_limit: limit,
          credit_used: used,
          available_credit: Math.max(0, limit - used),
        }));
      }
    } catch (err) {
      console.warn('Profile API fallback to local user context', err);
      if (user) {
        setFormData((prev) => ({
          ...prev,
          shop_name: user.shop?.shop_name || user.shopName || 'Retailer Store',
          owner_name: user.name || '',
          email: user.email || '',
          mobile: user.mobile || '',
          city: user.shop?.city || '',
          gstin: user.shop?.gstin || user.gstin || '24AAACP1234M1Z2',
        }));
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/shops/profile', {
        shop_name: formData.shop_name,
        owner_name: formData.owner_name,
        mobile: formData.mobile,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      });

      if (res.data?.success) {
        addToast({ title: 'Profile Updated', message: 'Shop details saved successfully!', type: 'success' });
      } else {
        addToast({ title: 'Update Notice', message: res.data?.message || 'Changes saved', type: 'info' });
      }
    } catch (err) {
      console.error('Failed to update shop details', err);
      addToast({
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update shop profile. Please verify your connection.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      addToast({ title: 'Password Mismatch', message: 'New password and confirm password do not match', type: 'warning' });
      return;
    }
    if (passwords.newPassword.length < 6) {
      addToast({ title: 'Weak Password', message: 'Password must be at least 6 characters long', type: 'warning' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      if (res.data?.success) {
        addToast({ title: 'Password Changed', message: 'Your login password was updated successfully!', type: 'success' });
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        addToast({ title: 'Update Notice', message: res.data?.message || 'Password update completed', type: 'info' });
      }
    } catch (err) {
      console.error('Failed to change password', err);
      addToast({
        title: 'Password Update Failed',
        message: err.response?.data?.message || 'Current password incorrect or request failed',
        type: 'error',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const res = await api.put('/shops/notification-preferences', prefData);
      if (res.data?.success) {
        addToast({ title: 'Preferences Saved', message: 'Notification preferences updated successfully!', type: 'success' });
      } else {
        addToast({ title: 'Notice', message: res.data?.message || 'Preferences recorded', type: 'info' });
      }
    } catch (e) {
      console.error('Save preferences error', e);
      addToast({
        title: 'Error',
        message: e.response?.data?.message || 'Failed to update notification channels',
        type: 'error',
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const safeCreditLimit = Number(formData.credit_limit || 250000);
  const safeAvailable = Number(formData.available_credit || 250000);
  const safeUsed = Number(formData.credit_used || 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* ═══════════════════════════════════════════════════════════
          HEADER: Profile Identity & Credit Standing
          ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20 flex-shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {formData.shop_name || 'Retailer Store'}
                </h1>
                <Badge variant="success">Approved B2B Retailer</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Owner: <span className="font-semibold text-slate-700 dark:text-slate-300">{formData.owner_name || user?.name || 'Owner'}</span> • GSTIN: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formData.gstin || '24AAACP1234M1Z2'}</span>
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-left sm:text-right">
            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-extrabold uppercase tracking-wider block">
              Trading Credit Limit
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              ₹{safeCreditLimit.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Available: <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{safeAvailable.toLocaleString('en-IN')}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* ═══════════════════════════════════════════════════════════
            FORM 1: Storefront Information & Address
            ═══════════════════════════════════════════════════════════ */}
        <Card title="Shop Information & Address" subtitle="Storefront details for delivery dispatch & billing">
          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Shop / Store Name
              </label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Owner / Contact Person
              </label>
              <input
                type="text"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Registered Mobile
                </label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  GSTIN (Verified)
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Storefront Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Shop No., Market / Street..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Save}
              disabled={saving}
              className="w-full font-bold shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </Card>

        {/* ═══════════════════════════════════════════════════════════
            FORM 2: Security & Password + Notification Channels
            ═══════════════════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Security & Password Form */}
          <Card title="Security & Password" subtitle="Update your wholesale portal login credentials">
            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  required
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                size="sm"
                icon={KeyRound}
                disabled={changingPassword}
                className="w-full font-bold"
              >
                {changingPassword ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
          </Card>

          {/* Notification Channels & Alert Preferences */}
          <Card
            title="Notification Channels & Alerts"
            subtitle="Configure WhatsApp, SMS, and in-app updates"
          >
            <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
              {/* Channel Toggles */}
              <div className="space-y-2.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[10px]">
                  Available Delivery Channels
                </span>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">In-App Notifications</p>
                      <p className="text-[10px] text-slate-400">Order dispatch alerts and stock updates</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Mandatory
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">WhatsApp Business Updates</p>
                      <p className="text-[10px] text-slate-400">Receive order & invoice PDFs on registered mobile</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!prefData.channel_whatsapp}
                    onChange={(e) => setPrefData({ ...prefData, channel_whatsapp: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">SMS Gateway Alerts</p>
                      <p className="text-[10px] text-slate-400">Critical delivery dispatch and billing receipts</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!prefData.channel_sms}
                    onChange={(e) => setPrefData({ ...prefData, channel_sms: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Event Subscriptions */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[10px]">
                  Event Preferences
                </span>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">Order & Delivery Dispatch Changes</span>
                  <input
                    type="checkbox"
                    checked={!!prefData.order_updates}
                    onChange={(e) => setPrefData({ ...prefData, order_updates: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">Credit Ledger & Payment Reminders</span>
                  <input
                    type="checkbox"
                    checked={!!prefData.payment_reminders}
                    onChange={(e) => setPrefData({ ...prefData, payment_reminders: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">Promotions & Wholesale Deals</span>
                  <input
                    type="checkbox"
                    checked={!!prefData.promotional_offers}
                    onChange={(e) => setPrefData({ ...prefData, promotional_offers: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Save}
                disabled={savingPrefs}
                className="w-full font-bold shadow-sm"
              >
                {savingPrefs ? 'Saving Preferences...' : 'Save Notification Preferences'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopProfile;
