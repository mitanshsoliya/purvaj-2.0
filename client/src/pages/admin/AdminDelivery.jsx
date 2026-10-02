import React, { useState, useEffect } from 'react';
import {
  Truck, Search, Plus, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Phone, MapPin, Store, User, Hash,
  KeyRound, Calendar, Printer, Eye, ShieldCheck, Clock,
  ArrowRight, FileText, Send, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import { useToast } from '../../context/ToastContext';

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending Processing' },
  { id: 'today', label: "Today's Deliveries" },
  { id: 'out_for_delivery', label: 'Out for Delivery' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'returns', label: 'Return Requests' },
  { id: 'cancelled', label: 'Cancelled' },
];

const LIFECYCLE_STAGES = [
  { value: 'ORDERED', label: '1. ORDERED (Order Placed)' },
  { value: 'CONFIRMED', label: '2. CONFIRMED (Inventory Reserved)' },
  { value: 'PROCESSING', label: '3. PROCESSING (Retrieval from Racks)' },
  { value: 'PACKED', label: '4. PACKED (Boxed with Tax Invoice)' },
  { value: 'OUT_FOR_DELIVERY', label: '5. OUT FOR DELIVERY (In Transit)' },
  { value: 'DELIVERED', label: '6. DELIVERED (Handover & Signed)' },
  { value: 'CANCELLED', label: 'CANCELLED (Order Voided)' },
  { value: 'RETURN_REQUESTED', label: 'RETURN REQUESTED (By Retailer)' },
  { value: 'RETURN_APPROVED', label: 'RETURN APPROVED (QC Verification)' },
  { value: 'PICKUP', label: 'PICKUP (Driver Dispatched for Return)' },
  { value: 'RETURNED', label: 'RETURNED (Restocked to Central Hub)' },
];

export const AdminDelivery = () => {
  const { addToast } = useToast();
  const [deliveries, setDeliveries] = useState([]);
  const [shops, setShops] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedShop, setSelectedShop] = useState('all');

  // Status Update & Driver Assignment Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: 'CONFIRMED',
    driver_name: '',
    driver_mobile: '',
    vehicle_number: '',
    estimated_delivery_date: '',
    note: '',
  });

  // Timeline / History Modal
  const [timelineOrder, setTimelineOrder] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, [activeTab, selectedShop]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await api.get('/admin/shops?limit=100');
      if (res.data?.data?.shops) setShops(res.data.data.shops);
    } catch (e) {
      console.error('Error fetching shops', e);
    }
  };

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('tab', activeTab);
      if (selectedShop !== 'all') params.append('shop_id', selectedShop);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '50');

      const res = await api.get(`/delivery?${params.toString()}`);
      if (res.data?.success && res.data?.data) {
        setDeliveries(res.data.data.deliveries || []);
        if (res.data.data.summary) {
          setSummary(res.data.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load deliveries', err);
      addToast('Failed to load deliveries list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusModal = (order) => {
    setSelectedOrder(order);
    setStatusForm({
      status: order.delivery_status || 'CONFIRMED',
      driver_name: order.latest_history?.driver_name || '',
      driver_mobile: order.latest_history?.driver_mobile || '',
      vehicle_number: order.latest_history?.vehicle_number || '',
      estimated_delivery_date: order.estimated_delivery_date ? order.estimated_delivery_date.slice(0, 10) : '',
      note: '',
    });
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setUpdatingStatus(true);

    try {
      const res = await api.patch(`/delivery/orders/${selectedOrder.id}/status`, statusForm);
      if (res.data?.success) {
        addToast(`Delivery status updated to ${statusForm.status}`, 'success');
        setIsStatusModalOpen(false);
        fetchDeliveries();
      }
    } catch (err) {
      console.error('Status update error', err);
      addToast(err.response?.data?.message || 'Failed to update delivery status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenTimeline = async (order) => {
    setTimelineOrder(order);
    setIsTimelineModalOpen(true);
    setLoadingTimeline(true);
    try {
      const res = await api.get(`/delivery/orders/${order.id}/timeline`);
      if (res.data?.success && res.data?.data) {
        setTimelineData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch timeline', err);
      addToast('Failed to load delivery timeline', 'error');
    } finally {
      setLoadingTimeline(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
    if (s === 'OUT_FOR_DELIVERY') return 'bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border-brand-300 animate-pulse';
    if (s === 'PACKED') return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300';
    if (s === 'PROCESSING') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
    if (s === 'CONFIRMED') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
    if (s === 'CANCELLED') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
    if (s.includes('RETURN')) return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            Delivery Management (Single Central Hub)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch manifest, driver tracking, status timeline, and automated WhatsApp/SMS milestones
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDeliveries}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Orders</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">{summary.total || 0}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block">Pending Prep</span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">{summary.pending || 0}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500 block">Today's Schedule</span>
          <span className="text-xl font-bold text-blue-600 mt-1 block">{summary.today || 0}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-500 block">Out for Delivery</span>
          <span className="text-xl font-bold text-brand-600 mt-1 block">{summary.out_for_delivery || 0}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block">Delivered</span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">{summary.delivered || 0}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500 block">Returns</span>
          <span className="text-xl font-bold text-purple-600 mt-1 block">{summary.returns || 0}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 block">Cancelled</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">{summary.cancelled || 0}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order #, Shop name, phone, or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchDeliveries();
            }}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">All Retailers</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shop_name} ({s.city})
              </option>
            ))}
          </select>

          <Button variant="secondary" size="sm" onClick={fetchDeliveries}>
            Apply
          </Button>
        </div>
      </div>

      {/* Deliveries Table */}
      <Card>
        {loading ? (
          <LoadingState message="Loading delivery records..." />
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No delivery orders found"
            description="No orders currently match the selected tab and filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="pb-3 font-semibold">Order Number</th>
                  <th className="pb-3 font-semibold">Destination Shop</th>
                  <th className="pb-3 font-semibold">Delivery Status</th>
                  <th className="pb-3 font-semibold">Scheduled Date</th>
                  <th className="pb-3 font-semibold">Driver & Vehicle</th>
                  <th className="pb-3 font-semibold text-right">Order Value</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {d.order_number}
                    </td>

                    <td className="py-3">
                      <p className="font-bold text-slate-900 dark:text-white">{d.shop_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {d.shop_city} • {d.contact_number || d.shop_mobile}
                      </p>
                    </td>

                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeColor(d.delivery_status)}`}>
                        {d.delivery_status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {d.estimated_delivery_date
                        ? new Date(d.estimated_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : 'Immediate'}
                    </td>

                    <td className="py-3">
                      {d.latest_history?.driver_name ? (
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {d.latest_history.driver_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {d.latest_history.vehicle_number || 'Central Fleet'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not Assigned</span>
                      )}
                    </td>

                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                      ₹{parseFloat(d.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenTimeline(d)}
                          title="View Audit Timeline"
                          className="p-1.5 text-slate-500 hover:text-brand-600"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenStatusModal(d)}
                          className="text-[11px] font-semibold"
                        >
                          Update Status
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* UPDATE STATUS & DRIVER MODAL */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={selectedOrder ? `Update Delivery: ${selectedOrder.order_number}` : 'Update Delivery Status'}
        size="md"
      >
        {selectedOrder && (
          <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>{selectedOrder.shop_name}</span>
                <span>₹{parseFloat(selectedOrder.total).toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[11px] text-slate-500">{selectedOrder.shop_address}, {selectedOrder.shop_city}</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                New Delivery Lifecycle Status
              </label>
              <select
                value={statusForm.status}
                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
              >
                {LIFECYCLE_STAGES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Bhai"
                  value={statusForm.driver_name}
                  onChange={(e) => setStatusForm({ ...statusForm, driver_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Driver Mobile
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9825012345"
                  value={statusForm.driver_mobile}
                  onChange={(e) => setStatusForm({ ...statusForm, driver_mobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Vehicle / Route Info
                </label>
                <input
                  type="text"
                  placeholder="e.g. GJ-01-TA-4412 (Tata 407)"
                  value={statusForm.vehicle_number}
                  onChange={(e) => setStatusForm({ ...statusForm, vehicle_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Estimated Delivery Date
                </label>
                <input
                  type="date"
                  value={statusForm.estimated_delivery_date}
                  onChange={(e) => setStatusForm({ ...statusForm, estimated_delivery_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Dispatch Notes / Location Remarks
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Dispatched from Bay 2. Delivery scheduled between 2 PM - 5 PM."
                value={statusForm.note}
                onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Updating status creates an immutable audit trail and triggers configured WhatsApp & SMS notifications.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={updatingStatus}>
                {updatingStatus ? 'Updating & Notifying...' : 'Save & Notify Retailer'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* TIMELINE / HISTORY MODAL */}
      <Modal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        title={timelineOrder ? `Delivery Audit Timeline: ${timelineOrder.order_number}` : 'Delivery Timeline'}
        size="md"
      >
        {loadingTimeline ? (
          <LoadingState message="Fetching timeline records..." />
        ) : (
          <div className="space-y-4 text-xs">
            {timelineData?.timeline && (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {timelineData.timeline.map((stage, idx) => (
                  <div key={idx} className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                        stage.completed
                          ? 'bg-emerald-500'
                          : stage.current
                          ? 'bg-brand-500 ring-2 ring-brand-300 animate-pulse'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                    <div className="flex items-baseline justify-between">
                      <p className={`font-bold ${stage.completed || stage.current ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {stage.title}
                      </p>
                      {stage.timestamp && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(stage.timestamp).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    {stage.notes && <p className="text-[11px] text-slate-500 italic mt-0.5">"{stage.notes}"</p>}
                    {stage.driver_name && (
                      <p className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5">
                        Driver: {stage.driver_name} • {stage.driver_mobile} ({stage.vehicle_number})
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {timelineData?.history && timelineData.history.length > 0 && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block text-[10px]">
                  Audit History Logs ({timelineData.history.length})
                </span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto">
                  {timelineData.history.map((h, i) => (
                    <div key={i} className="py-2 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-slate-400">
                        <span>{new Date(h.created_at).toLocaleString('en-IN')}</span>
                        <span>By: {h.changed_by_name || 'Admin Dispatch'}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200">
                        Status changed from <strong>{h.from_status}</strong> ➔ <strong>{h.to_status}</strong>
                      </p>
                      {h.note && <p className="text-slate-500 italic">"{h.note}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsTimelineModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDelivery;
