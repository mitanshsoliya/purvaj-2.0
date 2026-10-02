import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import {
  Store,
  MapPin,
  FileText,
  Phone,
  Mail,
  ShieldCheck,
  Lock,
  Users,
  CheckCircle2,
  Save,
  KeyRound,
  Plus,
  Trash2,
  Bell,
  Smartphone,
  MessageSquare
} from 'lucide-react';

export const ShopProfile = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Shop details form
  const [formData, setFormData] = useState({
    shop_name: '',
    owner_name: '',
    mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    credit_limit: 250000,
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
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Password change form
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Staff members
  const [staff, setStaff] = useState([
    { id: 1, name: 'Suresh Patel', role: 'Store Manager', mobile: '9898002001' },
    { id: 2, name: 'Ravi Kumar', role: 'Billing Operator', mobile: '9898002002' },
  ]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffMobile, setNewStaffMobile] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/shops/notification-preferences');
      if (res.data?.success && res.data?.data?.preferences) {
        setPrefData(res.data.data.preferences);
      }
    } catch (e) {
      console.error('Failed to load notification preferences', e);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const res = await api.put('/shops/notification-preferences', prefData);
      if (res.data?.success) {
        addToast('Notification preferences saved successfully', 'success');
      }
    } catch (e) {
      console.error('Save preferences error', e);
      addToast('Failed to save notification preferences', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };


  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shops/profile');
      if (res.data?.success && res.data?.data?.shop) {
        const s = res.data.data.shop;
        setFormData({
          shop_name: s.shop_name || '',
          owner_name: s.owner_name || '',
          mobile: s.mobile || '',
          email: s.email || '',
          address: s.address || '',
          city: s.city || '',
          state: s.state || 'Gujarat',
          pincode: s.pincode || '',
          gstin: s.gstin || '',
          credit_limit: parseFloat(s.credit_limit || 250000),
          payment_terms: s.payment_terms || '15 Days',
          status: s.status || 'active',
        });
      } else if (user?.shop) {
        setFormData((prev) => ({
          ...prev,
          shop_name: user.shop.shop_name || user.shopName || '',
          owner_name: user.name || '',
          email: user.email || '',
          mobile: user.mobile || '',
          city: user.shop.city || '',
          gstin: user.shop.gstin || user.gstin || '',
        }));
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    } finally {
      setLoading(false);
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
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      });

      if (res.data?.success) {
        addToast('Shop details updated successfully!', 'success');
      }
    } catch (err) {
      console.error('Failed to update shop details', err);
      addToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      addToast('New passwords do not match', 'warning');
      return;
    }
    if (passwords.newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      if (res.data?.success) {
        addToast('Password changed successfully!', 'success');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      console.error('Failed to change password', err);
      addToast(err.response?.data?.message || 'Password update failed', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffMobile) return;
    setStaff((prev) => [
      ...prev,
      { id: Date.now(), name: newStaffName, role: 'Store Clerk', mobile: newStaffMobile },
    ]);
    setNewStaffName('');
    setNewStaffMobile('');
    addToast('Staff member added', 'success');
  };

  const handleRemoveStaff = (id) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    addToast('Staff member removed', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header Profile Identity */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-xl shadow-soft flex-shrink-0">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formData.shop_name || 'Shree Krishna Traders'}
                </h1>
                <Badge variant="success">Approved Retailer</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Owner: <span className="font-semibold text-slate-700 dark:text-slate-300">{formData.owner_name || user?.name}</span> • GSTIN: <span className="font-mono text-slate-700 dark:text-slate-300">{formData.gstin || '24AAACP1234M1Z2'}</span>
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/40 text-left sm:text-right">
            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider block">
              Trading Credit Limit
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              ₹{formData.credit_limit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form: Shop Information & Address */}
        <Card title="Shop Information & Address" subtitle="Storefront details for delivery & billing">
          <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Shop / Store Name
              </label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  GSTIN (Read Only)
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-500 font-mono"
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
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Save}
              disabled={saving}
              className="w-full font-bold shadow-soft"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </Card>

        {/* Change Password & Staff Section */}
        <div className="space-y-6">
          {/* Change Password Form */}
          <Card title="Security & Password" subtitle="Update your portal login credentials">
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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

          {/* Shop Staff Contacts */}
          <Card title="Authorized Shop Staff" subtitle="Store staff authorized to accept deliveries">
            <div className="space-y-3">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {staff.map((s) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {s.role} • {s.mobile}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStaff(s.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddStaff} className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Staff Name"
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={newStaffMobile}
                  onChange={(e) => setNewStaffMobile(e.target.value)}
                  placeholder="Mobile"
                  className="w-28 px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
                <Button type="submit" variant="secondary" size="sm" icon={Plus}>
                  Add
                </Button>
              </form>
            </div>
          </Card>

          {/* Notification Preferences & Channels */}
          <Card
            title="Notification Channels & Alerts"
            subtitle="Configure WhatsApp, SMS, and in-app updates"
          >
            <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
              {/* Channel Toggles */}
              <div className="space-y-2.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[10px]">
                  Available Channels
                </span>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">In-App Notifications</p>
                      <p className="text-[10px] text-slate-400">Order, payment, and dispatch alerts in portal</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Mandatory
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">WhatsApp Business Updates</p>
                      <p className="text-[10px] text-slate-400">Receive order & invoice PDFs on registered mobile</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefData.channel_whatsapp}
                    onChange={(e) => setPrefData({ ...prefData, channel_whatsapp: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300 dark:border-slate-700 focus:ring-brand-500 cursor-pointer"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">SMS Gateway Alerts</p>
                      <p className="text-[10px] text-slate-400">Critical delivery milestones and payment reminders</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefData.channel_sms}
                    onChange={(e) => setPrefData({ ...prefData, channel_sms: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300 dark:border-slate-700 focus:ring-brand-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Event Subscriptions */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[10px]">
                  Event Preferences
                </span>

                <label className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">Order & Delivery Status Changes</span>
                  <input
                    type="checkbox"
                    checked={prefData.order_updates}
                    onChange={(e) => setPrefData({ ...prefData, order_updates: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">Udhaar Balance & Payment Reminders</span>
                  <input
                    type="checkbox"
                    checked={prefData.payment_reminders}
                    onChange={(e) => setPrefData({ ...prefData, payment_reminders: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                  <span className="text-slate-700 dark:text-slate-300">Promotions & Wholesale Broadcasts</span>
                  <input
                    type="checkbox"
                    checked={prefData.promotional_offers}
                    onChange={(e) => setPrefData({ ...prefData, promotional_offers: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300"
                  />
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Save}
                disabled={savingPrefs}
                className="w-full font-bold shadow-soft"
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

