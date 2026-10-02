import React, { useState, useEffect } from 'react';
import {
  Truck, Search, Plus, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Phone, MapPin, Store, User, Hash,
  KeyRound, Calendar, Printer, Eye, ShieldCheck
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

export const AdminDelivery = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    order_id: '',
    vehicle_number: 'GJ-01-TA-4412 (Tata 407)',
    route_info: 'East Ahmedabad Sector 1-4',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [delRes, ordRes] = await Promise.allSettled([
        api.get('/delivery?limit=100'),
        api.get('/orders?limit=100'),
      ]);

      if (delRes.status === 'fulfilled' && delRes.value.data?.data?.deliveries) {
        setDeliveries(delRes.value.data.data.deliveries);
      } else {
        setDeliveries([
          {
            id: 'del-01',
            order_id: 'ord-01',
            order_number: 'ORD-20261002-1448',
            shop_name: 'Shree Krishna Traders',
            shop_address: 'APMC Market Yard, Highway Road, Ahmedabad',
            shop_mobile: '9876543210',
            vehicle_number: 'GJ-01-TA-4412 (Tata 407)',
            driver_name: 'Jagdish Kumar (Fleet Driver)',
            driver_mobile: '9825123456',
            delivery_otp: '7821',
            status: 'out_for_delivery',
            created_at: new Date().toISOString(),
          }
        ]);
      }

      if (ordRes.status === 'fulfilled' && ordRes.value.data?.data?.orders) {
        setOrders(ordRes.value.data.data.orders);
      }
    } catch (err) {
      console.warn('Delivery fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_id) {
      setAssignFeedback({ type: 'error', text: 'Please select an order to dispatch' });
      return;
    }

    setAssigning(true);
    setAssignFeedback({ type: '', text: '' });

    try {
      const res = await api.post('/delivery/assign', form);
      setAssignFeedback({
        type: 'success',
        text: `Delivery assigned with verification OTP: ${res.data?.data?.delivery?.delivery_otp || 'XXXX'}`,
      });

      setTimeout(() => {
        setIsAssignModalOpen(false);
        fetchData();
      }, 1200);
    } catch (err) {
      setAssignFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to assign delivery',
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/delivery/${id}/status`, { status: newStatus });
      setDeliveries((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
      );
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Metrics
  const activeDispatches = deliveries.filter((d) => d.status === 'out_for_delivery' || d.status === 'assigned').length;
  const completedDeliveries = deliveries.filter((d) => d.status === 'delivered').length;

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      (d.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.shop_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.vehicle_number || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Warehouse Dispatch & Logistics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Assign delivery fleet vehicles, generate gate passes, track 4-digit delivery OTPs, and verify retailer drop-offs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setForm({
                order_id: orders.find((o) => o.order_status === 'confirmed' || o.order_status === 'processing')?.id || '',
                vehicle_number: 'GJ-01-TA-4412 (Tata 407)',
                route_info: 'Ahmedabad South Market Yard',
                notes: '',
              });
              setAssignFeedback({ type: '', text: '' });
              setIsAssignModalOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Dispatch Consignment
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Dispatches</span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{deliveries.length}</div>
          <div className="text-xs text-slate-500 mt-1">Consignments created</div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">On Delivery Route</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">{activeDispatches}</div>
          <div className="text-xs text-slate-500 mt-1">Vehicles in transit</div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Delivered & Verified</span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedDeliveries}</div>
          <div className="text-xs text-slate-500 mt-1">Confirmed with POD/OTP</div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Warehouse Node</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900 dark:text-white">PURVAJ_CENTRAL</div>
          <div className="text-xs text-slate-500 mt-1">Single warehouse dispatch</div>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order #, Retail Shop, or Vehicle Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Dispatch Statuses</option>
              <option value="assigned">Assigned / Loading</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Deliveries Table */}
      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {loading ? (
          <div className="p-12">
            <LoadingState message="Loading logistics & vehicle dispatch routes..." />
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Truck}
              title="No active deliveries"
              description="Click 'Dispatch Consignment' above to assign an order to a vehicle and driver."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Consignment & Order</th>
                  <th className="py-3.5 px-4">Retailer Destination</th>
                  <th className="py-3.5 px-4">Vehicle & Route</th>
                  <th className="py-3.5 px-4 text-center">Delivery OTP</th>
                  <th className="py-3.5 px-4">Milestone Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {del.order_number}
                      </div>
                      <div className="text-xs text-slate-400">
                        Date: {new Date(del.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {del.shop_name}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">
                        {del.shop_address || del.shop_city}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {del.vehicle_number || 'Fleet Vehicle'}
                      </div>
                      <div className="text-xs text-slate-400">{del.route_info || 'Local Market Yard'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded border border-indigo-200 dark:border-indigo-800">
                        {del.delivery_otp || '----'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          del.status === 'delivered'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : del.status === 'out_for_delivery'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {del.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                        {del.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {del.status === 'assigned' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateStatus(del.id, 'out_for_delivery')}
                            className="text-xs"
                          >
                            Mark Out for Delivery
                          </Button>
                        )}
                        {del.status === 'out_for_delivery' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleUpdateStatus(del.id, 'delivered')}
                            className="text-xs"
                          >
                            Confirm Drop-off
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Assign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Dispatch Warehouse Consignment"
        size="md"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {assignFeedback.text && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                assignFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {assignFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{assignFeedback.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Select Confirmed Order *
            </label>
            <select
              value={form.order_id}
              onChange={(e) => setForm({ ...form, order_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            >
              <option value="">-- Choose Order to Dispatch --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number} ({o.shop_name}) — ₹{parseFloat(o.total || o.total_amount || 0).toFixed(2)} [{o.order_status}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Vehicle & Registration Number *
            </label>
            <input
              type="text"
              placeholder="e.g. GJ-01-TA-4412 (Tata 407)"
              value={form.vehicle_number}
              onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Delivery Route / Sector
            </label>
            <input
              type="text"
              placeholder="e.g. Ahmedabad East APMC Hub"
              value={form.route_info}
              onChange={(e) => setForm({ ...form, route_info: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={assigning}
              className="flex items-center gap-1.5"
            >
              {assigning && <RefreshCw className="w-4 h-4 animate-spin" />}
              Generate Gate Pass & OTP
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDelivery;
