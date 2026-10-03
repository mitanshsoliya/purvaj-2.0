import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, Search, Filter, Edit, Trash2,
  CheckCircle2, AlertTriangle, Layers, Tag, DollarSign,
  TrendingUp, RefreshCw, Barcode, Eye, Upload, Image as ImageIcon,
  X, Sparkles, WifiOff, Check
} from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/common/Card';
import KPICard from '../../components/common/KPICard';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';

const GST_SLABS = [
  { value: '0', label: '0% (Exempt)' },
  { value: '5', label: '5% GST' },
  { value: '12', label: '12% GST' },
  { value: '18', label: '18% GST' },
  { value: '28', label: '28% GST' },
];

const UNIT_OPTIONS = [
  { value: 'piece', label: 'Piece (Pcs)' },
  { value: 'box', label: 'Box' },
  { value: 'carton', label: 'Carton' },
  { value: 'pack', label: 'Pack' },
  { value: 'kg', label: 'Kilogram (Kg)' },
  { value: 'litre', label: 'Litre (L)' },
];

// Curated high quality FMCG wholesale product presets
const PRESET_IMAGES = [
  {
    name: 'Wafers & Chips',
    url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80',
    icon: '🥔',
  },
  {
    name: 'Biscuits & Cookies',
    url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80',
    icon: '🍪',
  },
  {
    name: 'Edible Cooking Oil',
    url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
    icon: '🧴',
  },
  {
    name: 'Atta & Flours',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    icon: '🌾',
  },
  {
    name: 'Tea & Beverages',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
    icon: '☕',
  },
  {
    name: 'Cleaning & Detergents',
    url: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=400&q=80',
    icon: '🧼',
  },
];

// Offline Fallback Seed Products
const FALLBACK_PRODUCTS = [
  {
    id: 'p-01',
    name: 'Balaji Masala Wafers 150g',
    sku: 'BALAJI-WAF-01',
    barcode: '8901234567890',
    category_name: 'Snacks & Namkeen',
    brand_name: 'Balaji Wafers',
    selling_price: 26.50,
    mrp: 30.00,
    tax_rate: 12,
    unit: 'piece',
    pack_size: 24,
    available_stock: 450,
    current_stock: 480,
    reserved_stock: 30,
    minimum_stock: 50,
    minimum_order_quantity: 12,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-02',
    name: 'Parle-G Gold Biscuits 1kg Box',
    sku: 'PARLE-G-1KG',
    barcode: '8901234567891',
    category_name: 'Bakery & Biscuits',
    brand_name: 'Parle',
    selling_price: 115.00,
    mrp: 140.00,
    tax_rate: 18,
    unit: 'box',
    pack_size: 10,
    available_stock: 120,
    current_stock: 140,
    reserved_stock: 20,
    minimum_stock: 25,
    minimum_order_quantity: 5,
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'p-03',
    name: 'Fortune Refined Sunflower Oil 1L Pouch',
    sku: 'FORT-OIL-1L',
    barcode: '8901234567892',
    category_name: 'Edible Oils & Ghee',
    brand_name: 'Fortune',
    selling_price: 138.00,
    mrp: 165.00,
    tax_rate: 5,
    unit: 'piece',
    pack_size: 15,
    available_stock: 15,
    current_stock: 25,
    reserved_stock: 10,
    minimum_stock: 30,
    minimum_order_quantity: 15,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
  },
];

export const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [networkError, setNetworkError] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef(null);

  // Form Fields
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    brand_id: '',
    unit: 'piece',
    pack_size: 1,
    mrp: '',
    selling_price: '',
    purchase_price: '',
    tax_rate: '18',
    hsn_code: '',
    minimum_order_quantity: 1,
    minimum_stock: 10,
    initial_stock: 50,
    image: '',
    description: '',
  });

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setNetworkError(false);
    try {
      const [prodsRes, catsRes, brandsRes] = await Promise.all([
        api.get('/products?limit=100').catch((e) => {
          throw e;
        }),
        api.get('/categories').catch(() => ({ data: { data: { categories: [] } } })),
        api.get('/admin/brands').catch(() => ({ data: { data: { brands: [] } } })),
      ]);

      if (prodsRes.data?.data?.products) {
        setProducts(prodsRes.data.data.products);
        setNetworkError(false);
      }
      if (catsRes.data?.data?.categories) {
        setCategories(catsRes.data.data.categories);
      }
      if (brandsRes.data?.data?.brands) {
        setBrands(brandsRes.data.data.brands);
      }
    } catch (err) {
      console.warn('Backend server check:', err.message);
      if (!err.response) {
        setNetworkError(true);
      }
      if (products.length === 0) {
        setProducts(FALLBACK_PRODUCTS);
        setCategories([
          { id: 'cat-1', name: 'Snacks & Namkeen' },
          { id: 'cat-2', name: 'Bakery & Biscuits' },
          { id: 'cat-3', name: 'Edible Oils & Ghee' },
        ]);
        setBrands([
          { id: 'b-1', name: 'Balaji Wafers' },
          { id: 'b-2', name: 'Parle' },
          { id: 'b-3', name: 'Fortune' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      sku: `PRV-${Date.now().toString().slice(-5)}`,
      barcode: '',
      category_id: categories[0]?.id || '',
      brand_id: brands[0]?.id || '',
      unit: 'piece',
      pack_size: 1,
      mrp: '',
      selling_price: '',
      purchase_price: '',
      tax_rate: '18',
      hsn_code: '210690',
      minimum_order_quantity: 1,
      minimum_stock: 10,
      initial_stock: 50,
      image: '',
      description: '',
    });
    setFormError('');
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setFormData({
      id: p.id,
      name: p.name || '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      category_id: p.category_id || '',
      brand_id: p.brand_id || '',
      unit: p.unit || 'piece',
      pack_size: p.pack_size || 1,
      mrp: p.mrp || '',
      selling_price: p.selling_price || '',
      purchase_price: p.purchase_price || '',
      tax_rate: p.tax_rate ? String(p.tax_rate) : '18',
      hsn_code: p.hsn_code || '',
      minimum_order_quantity: p.minimum_order_quantity || 1,
      minimum_stock: p.minimum_stock || 0,
      initial_stock: p.current_stock || 0,
      image: p.image || '',
      description: p.description || '',
    });
    setFormError('');
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Handle Image File Upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    // 1. Read Base64 immediately for instantaneous local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({ ...prev, image: event.target.result }));
    };
    reader.readAsDataURL(file);

    // 2. Try uploading to backend /api/upload
    setUploadingImage(true);
    try {
      const data = new FormData();
      data.append('image', file);

      const res = await api.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.data?.url) {
        setFormData((prev) => ({ ...prev, image: res.data.data.url }));
      }
    } catch (err) {
      console.warn('Backend file upload failed, using local image data:', err);
      // The Base64 preview is already set, so it remains usable!
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode?.trim() || null,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        unit: formData.unit,
        pack_size: parseInt(formData.pack_size) || 1,
        mrp: parseFloat(formData.mrp),
        selling_price: parseFloat(formData.selling_price),
        purchase_price: parseFloat(formData.purchase_price) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        hsn_code: formData.hsn_code?.trim() || null,
        minimum_order_quantity: parseInt(formData.minimum_order_quantity) || 1,
        minimum_stock: parseInt(formData.minimum_stock) || 0,
        initial_stock: parseInt(formData.initial_stock) || 0,
        image: formData.image?.trim() || null,
        description: formData.description?.trim() || null,
      };

      if (!payload.name) throw new Error('Product name is required');
      if (!payload.sku) throw new Error('SKU code is required');
      if (isNaN(payload.mrp) || payload.mrp <= 0) throw new Error('Valid MRP is required');
      if (isNaN(payload.selling_price) || payload.selling_price <= 0) throw new Error('Valid Wholesale Selling Price is required');

      try {
        if (isEditing && formData.id) {
          await api.put(`/products/${formData.id}`, payload);
        } else {
          await api.post('/products', payload);
        }
        await fetchData();
      } catch (backendErr) {
        if (backendErr.code === 'ERR_NETWORK' || backendErr.code === 'ECONNREFUSED') {
          // Offline mode save
          const newProduct = {
            id: isEditing ? formData.id : `p-${Date.now()}`,
            ...payload,
            available_stock: payload.initial_stock,
            current_stock: payload.initial_stock,
            reserved_stock: 0,
            category_name: categories.find((c) => c.id === payload.category_id)?.name || 'General',
            brand_name: brands.find((b) => b.id === payload.brand_id)?.name || 'Wholesale',
          };

          if (isEditing) {
            setProducts((prev) => prev.map((p) => (p.id === formData.id ? { ...p, ...newProduct } : p)));
          } else {
            setProducts((prev) => [newProduct, ...prev]);
          }
        } else {
          throw backendErr;
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`).catch(() => {});
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);

    const matchesCat = !categoryFilter || p.category_id === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'in_stock') matchesStock = p.available_stock > p.minimum_stock;
    if (stockFilter === 'low_stock') matchesStock = p.available_stock > 0 && p.available_stock <= p.minimum_stock;
    if (stockFilter === 'out_of_stock') matchesStock = p.available_stock <= 0;

    return matchesSearch && matchesCat && matchesStock;
  });

  const totalCount = products.length;
  const inStockCount = products.filter((p) => p.available_stock > p.minimum_stock).length;
  const lowStockCount = products.filter((p) => p.available_stock <= p.minimum_stock).length;

  return (
    <div className="space-y-6">
      {/* Network Error Banner if Backend is not responding */}
      {networkError && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Backend Server Notice:</strong> Backend server at <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">http://localhost:5000</code> is offline. Running in demo mode. Make sure to run <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-bold">npm run dev</code> in the project folder to start both frontend & backend.
            </span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 font-semibold transition-colors flex-shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-500" />
            <span>Wholesale Product Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Central Warehouse inventory, GST tax slabs, product images, and wholesale tier pricing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchData}
            isLoading={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAdd}
            className="shadow-soft-md"
          >
            Add New Product
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Total Products"
          value={totalCount.toString()}
          subtitle="Master Catalog Active"
          icon={Package}
          iconColor="brand"
          isLoading={loading}
        />

        <KPICard
          title="Healthy Stock"
          value={inStockCount.toString()}
          subtitle="Ready for wholesale dispatch"
          icon={CheckCircle2}
          iconColor="emerald"
          isLoading={loading}
        />

        <KPICard
          title="Low Stock Alert"
          value={lowStockCount.toString()}
          subtitle="Reorder required soon"
          icon={AlertTriangle}
          iconColor="amber"
          badge={lowStockCount > 0 ? `${lowStockCount} Critical` : undefined}
          isLoading={loading}
        />

        <KPICard
          title="Categories"
          value={categories.length.toString()}
          subtitle="Active Classifications"
          icon={Layers}
          iconColor="purple"
          isLoading={loading}
        />
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Product Name, SKU, Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock Only</option>
              <option value="low_stock">Low Stock (Needs Refill)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Product List Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <LoadingState message="Loading wholesale product catalog..." />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={Package}
              title="No Products Found"
              description="No products match your current search or filters. Click 'Add New Product' to create one."
              actionLabel="Add First Product"
              onAction={handleOpenAdd}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Product Details</th>
                  <th className="py-3.5 px-4">Category & Brand</th>
                  <th className="py-3.5 px-4 text-right">Wholesale Rate</th>
                  <th className="py-3.5 px-4 text-right">MRP</th>
                  <th className="py-3.5 px-4 text-center">GST %</th>
                  <th className="py-3.5 px-4 text-center">Warehouse Stock</th>
                  <th className="py-3.5 px-4 text-center">MOQ</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((p) => {
                  const isLow = p.available_stock <= p.minimum_stock;
                  const isOut = p.available_stock <= 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-soft-xs">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                              {p.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>SKU: {p.sku}</span>
                              {p.hsn_code && <span>• HSN: {p.hsn_code}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {p.category_name || 'Uncategorized'}
                        </div>
                        <div className="text-[11px] text-slate-400">{p.brand_name || 'No Brand'}</div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-brand-600 dark:text-brand-400 text-sm">
                          ₹{parseFloat(p.selling_price).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400">per {p.unit}</div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="text-slate-500 line-through text-xs">
                          ₹{parseFloat(p.mrp).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          {p.mrp > p.selling_price
                            ? `${Math.round(((p.mrp - p.selling_price) / p.mrp) * 100)}% Margin`
                            : 'Standard'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.tax_rate}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-semibold">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span
                            className={
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-900 dark:text-slate-100'
                            }
                          >
                            {p.available_stock} {p.unit}s
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Min: {p.minimum_stock} | Res: {p.reserved_stock || 0}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                        {p.minimum_order_quantity} {p.unit}s
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Deactivate Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Wholesale Product' : 'Add New Product to Warehouse'}
        subtitle="Configure product images, wholesale pricing, tax slabs, and warehouse stock"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400">
              {formError}
            </div>
          )}

          {/* PRODUCT IMAGE SECTION */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Product Image & Thumbnail
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Image Preview Box */}
              <div className="relative w-24 h-24 rounded-xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 group">
                {formData.image ? (
                  <>
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                    <span className="text-[10px]">No Image</span>
                  </div>
                )}
              </div>

              {/* Upload & Select Buttons */}
              <div className="flex-1 w-full space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={uploadingImage}
                    className="text-xs"
                  >
                    Upload from Device
                  </Button>
                  <span className="text-[11px] text-slate-400">JPG, PNG, WebP (Max 5MB)</span>
                </div>

                {/* Instant Presets Bar */}
                <div className="pt-1">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Quick Product Preset Images:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setFormData({ ...formData, image: preset.url })}
                        className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all
                          ${
                            formData.image === preset.url
                              ? 'bg-brand-600 text-white shadow-soft-xs'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500'
                          }
                        `}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Optional URL Input */}
            <div>
              <input
                type="url"
                placeholder="Or paste an image web URL: https://..."
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Product Full Name"
                required
                placeholder="e.g. Parle-G Glucose Biscuits 800g Super Pack"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <Input
              label="SKU Code"
              required
              placeholder="PRV-1001"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />

            <Input
              label="Barcode / EAN (Optional)"
              placeholder="8901234567890"
              icon={Barcode}
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            />

            <Select
              label="Product Category"
              required
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            />

            <Select
              label="Brand"
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              value={formData.brand_id}
              onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
            />

            <Select
              label="Billing Unit"
              options={UNIT_OPTIONS}
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />

            <Input
              label="Pack Size (Units per Box/Carton)"
              type="number"
              min="1"
              value={formData.pack_size}
              onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
            />

            <Input
              label="Maximum Retail Price (MRP ₹)"
              type="number"
              step="0.01"
              required
              placeholder="e.g. 50.00"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
            />

            <Input
              label="Wholesale Selling Price (₹)"
              type="number"
              step="0.01"
              required
              placeholder="e.g. 42.50"
              value={formData.selling_price}
              onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
            />

            <Input
              label="Purchase / Cost Price (₹)"
              type="number"
              step="0.01"
              placeholder="e.g. 38.00"
              value={formData.purchase_price}
              onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
            />

            <Select
              label="GST Tax Rate (%)"
              options={GST_SLABS}
              value={formData.tax_rate}
              onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
            />

            <Input
              label="HSN Code"
              placeholder="e.g. 210690"
              value={formData.hsn_code}
              onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
            />

            <Input
              label="Min Order Qty (MOQ)"
              type="number"
              min="1"
              value={formData.minimum_order_quantity}
              onChange={(e) => setFormData({ ...formData, minimum_order_quantity: e.target.value })}
            />

            <Input
              label="Low Stock Alert Threshold"
              type="number"
              min="0"
              value={formData.minimum_stock}
              onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
            />

            {!isEditing && (
              <Input
                label="Initial Opening Stock (Units)"
                type="number"
                min="0"
                value={formData.initial_stock}
                onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={submitting}
            >
              {isEditing ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminProducts;
