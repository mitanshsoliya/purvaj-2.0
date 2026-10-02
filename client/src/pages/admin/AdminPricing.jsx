import React, { useState, useEffect } from 'react';
import {
  BadgePercent, Search, Plus, RefreshCw, CheckCircle2,
  DollarSign, Store, Package, Edit3, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';

export const AdminPricing = () => {
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Set Custom Price Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, shopRes] = await Promise.allSettled([
        api.get('/products?limit=100'),
        api.get('/admin/shops?limit=100'),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value.data?.data?.products) {
        setProducts(prodRes.data.data.products);
      }
      if (shopRes.status === 'fulfilled' && shopRes.value.data?.data?.shops) {
        setShops(shopRes.value.data.data.shops);
      }
    } catch (err) {
      console.warn('Pricing fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPriceModal = (product) => {
    setSelectedProduct(product);
    setSelectedShopId(shops[0]?.id || '');
    setCustomPrice(product.selling_price || '');
    setFeedback({ type: '', text: '' });
    setIsModalOpen(true);
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!selectedShopId || !customPrice) {
      setFeedback({ type: 'error', text: 'Select a shop and enter price override' });
      return;
    }

    setSaving(true);
    setFeedback({ type: '', text: '' });

    try {
      await api.post(`/products/${selectedProduct.id}/shop-price`, {
        shop_id: selectedShopId,
        price: parseFloat(customPrice),
      });

      setFeedback({ type: 'success', text: 'Custom wholesale price locked for this shop!' });
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to save shop price override' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = products.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <BadgePercent className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            B2B Wholesale Pricing & Shop Contract Rates
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure catalog wholesale base rates, MRP margins, and retailer-specific contract price overrides.
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
        </div>
      </div>

      <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog items to adjust contract wholesale pricing..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {loading ? (
          <div className="p-12">
            <LoadingState message="Loading catalog pricing rules..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={BadgePercent}
              title="No products found"
              description="No catalog products match your search query."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Product Name & SKU</th>
                  <th className="py-3.5 px-4 text-right">Printed MRP (₹)</th>
                  <th className="py-3.5 px-4 text-right">Base Wholesale Rate (₹)</th>
                  <th className="py-3.5 px-4 text-center">Retailer Margin %</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((prod) => {
                  const mrp = parseFloat(prod.mrp) || 0;
                  const sell = parseFloat(prod.selling_price) || 0;
                  const margin = mrp > 0 ? (((mrp - sell) / mrp) * 100).toFixed(1) : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{prod.name}</div>
                        <div className="text-xs text-slate-400">SKU: {prod.sku}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                        ₹{mrp.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-base">
                        ₹{sell.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                          {margin}% Margin
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openPriceModal(prod)}
                          className="text-xs flex items-center gap-1 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Set Shop Override
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Override Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? `Contract Rate: ${selectedProduct.name}` : 'Set Shop Price'}
        size="md"
      >
        <form onSubmit={handleSavePrice} className="space-y-4">
          {feedback.text && (
            <div className={`p-3 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {feedback.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Select Retail Shop *
            </label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
              required
            >
              <option value="">-- Choose Retail Partner --</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shop_name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Custom Wholesale Price Override (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-bold"
              required
            />
            <div className="text-[11px] text-slate-400 mt-1">
              Standard Base Wholesale Rate: ₹{parseFloat(selectedProduct?.selling_price || 0).toFixed(2)}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Lock Contract Price'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPricing;
