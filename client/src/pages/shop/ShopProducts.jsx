import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  Plus,
  Minus,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../services/api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export const ShopProducts = () => {
  const { addItem, updateQuantity, items: cartItems, cartCount, grandTotal } = useCart();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Product detail modal state
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Local quantity buffer per product id for stepper before adding
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedBrand, debouncedSearch, inStockOnly]);

  const fetchInitialData = async () => {
    try {
      const [catsRes, brandsRes] = await Promise.allSettled([
        api.get('/categories'),
        api.get('/admin/brands'),
      ]);

      if (catsRes.status === 'fulfilled' && catsRes.value.data?.data) {
        setCategories(catsRes.value.data.data.categories || []);
      }
      if (brandsRes.status === 'fulfilled' && brandsRes.value.data?.data) {
        setBrands(brandsRes.value.data.data.brands || []);
      }
    } catch (err) {
      console.error('Failed to load filter metadata', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedBrand) params.append('brand_id', selectedBrand);
      if (debouncedSearch) params.append('search', debouncedSearch);
      params.append('status', 'active');
      params.append('limit', '100');

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data?.success && res.data?.data) {
        let prods = res.data.data.products || [];
        if (inStockOnly) {
          prods = prods.filter((p) => {
            const stock = parseInt(p.available_stock ?? p.current_stock ?? 0, 10);
            return stock > 0;
          });
        }
        setProducts(prods);

        // Pre-fill default quantities with MOQ
        const initialQtys = {};
        prods.forEach((p) => {
          const moq = parseInt(p.minimum_order_quantity || 1, 10);
          initialQtys[p.id] = moq;
        });
        setQuantities((prev) => ({ ...initialQtys, ...prev }));
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (productId, delta, moq, maxStock) => {
    setQuantities((prev) => {
      const current = prev[productId] || moq;
      const next = current + delta;
      if (next < moq) return prev;
      if (maxStock > 0 && next > maxStock) return prev;
      return { ...prev, [productId]: next };
    });
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Wholesale Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Your exclusive contract pricing & real-time central warehouse stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/shop/quick-order" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="w-full">
              Quick Bulk Order
            </Button>
          </Link>
          <Link to="/shop/cart" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" icon={ShoppingCart} className="w-full">
              Cart ({cartCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, brand, SKU or barcode..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Horizontal Scroll Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === ''
                ? 'bg-brand-600 text-white shadow-soft-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-soft-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Secondary Filters: Brand & Stock Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-brand-600 focus:ring-brand-500"
              />
              <span>In Stock Only</span>
            </label>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            {products.length} products found
          </span>
        </div>
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No products found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or switching categories.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSelectedCategory('');
              setSelectedBrand('');
              setSearchQuery('');
              setInStockOnly(false);
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {products.map((p) => {
            const applicablePrice = parseFloat(p.final_price || p.selling_price || 0);
            const standardPrice = parseFloat(p.standard_price || p.selling_price || applicablePrice);
            const hasSpecialPrice = applicablePrice < standardPrice;
            const moq = parseInt(p.minimum_order_quantity || 1, 10);
            const stock = parseInt(p.available_stock ?? p.current_stock ?? 0, 10);
            const isOutOfStock = stock <= 0;
            const isLowStock = stock > 0 && stock <= 15;

            // Check if already in cart
            const cartItem = cartItems.find((ci) => ci.id === p.id);
            const qty = quantities[p.id] || moq;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between shadow-soft hover:shadow-soft-md transition-all group"
              >
                <div>
                  {/* Top Image + Badges */}
                  <div
                    onClick={() => setSelectedProduct(p)}
                    className="relative w-full aspect-video sm:aspect-square rounded-lg bg-slate-50 dark:bg-slate-850 mb-3 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800 cursor-pointer"
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    )}

                    {/* Pricing Pill */}
                    {hasSpecialPrice && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-soft-sm">
                        Store Rate
                      </span>
                    )}

                    {/* Stock status pill */}
                    <div className="absolute bottom-2 right-2">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                          Only {stock} left
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          In Stock ({stock})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Brand & SKU */}
                  <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 font-mono mb-1">
                    <span className="truncate">{p.brand_name || 'Generic FMCG'}</span>
                    <span className="truncate">SKU: {p.sku}</span>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setSelectedProduct(p)}
                    className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {p.name}
                  </h3>

                  {/* Unit & MOQ info */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <span>Pack: {p.unit || 'Carton'}</span>
                    <span>•</span>
                    <span className="text-brand-600 dark:text-brand-400 font-medium">
                      MOQ: {moq} {p.unit || 'pcs'}
                    </span>
                  </p>
                </div>

                {/* Price & Action Section */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          ₹{applicablePrice.toFixed(2)}
                        </span>
                        {hasSpecialPrice && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{standardPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        + {p.tax_rate || 0}% GST (HSN: {p.hsn_code || '1905'})
                      </span>
                    </div>

                    {cartItem && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                        {cartItem.quantity} in cart
                      </span>
                    )}
                  </div>

                  {/* Mobile-Friendly Stepper & Add Button */}
                  <div className="flex items-center gap-2">
                    {/* Stepper */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden">
                      <button
                        type="button"
                        disabled={isOutOfStock || qty <= moq}
                        onClick={() => handleQtyChange(p.id, -1, moq, stock)}
                        className="px-2 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={moq}
                        max={stock > 0 ? stock : undefined}
                        value={qty}
                        disabled={isOutOfStock}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setQuantities((prev) => ({ ...prev, [p.id]: val }));
                          }
                        }}
                        className="w-12 text-center text-xs font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={isOutOfStock || (stock > 0 && qty >= stock)}
                        onClick={() => handleQtyChange(p.id, 1, moq, stock)}
                        className="px-2 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addItem(p, qty)}
                      className="flex-1 py-2 px-3 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed shadow-soft flex items-center justify-center gap-1.5 transition-all active:scale-98"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{cartItem ? 'Add More' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Cart Bar (Appears when cart has items) */}
      {cartCount > 0 && (
        <div className="fixed bottom-16 lg:bottom-6 left-4 right-4 max-w-xl mx-auto z-40 bg-navy-950 text-white rounded-2xl p-3.5 shadow-soft-xl border border-navy-800 flex items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white shadow-soft">
              {cartCount}
            </div>
            <div>
              <p className="text-xs text-slate-300">Items in Wholesale Cart</p>
              <p className="text-sm font-bold text-white">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <Link to="/shop/cart">
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRight}
              iconPosition="right"
              className="bg-brand-500 hover:bg-brand-400 font-bold"
            >
              View Cart & Checkout
            </Button>
          </Link>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <Modal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          title="Product Specifications & Details"
          subtitle={`SKU: ${selectedProduct.sku} • HSN: ${selectedProduct.hsn_code || '1905'}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-48 h-48 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                {selectedProduct.image ? (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-16 h-16 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide">
                  {selectedProduct.brand_name || 'Generic FMCG'}
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedProduct.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {selectedProduct.description || 'Premium commercial wholesale product sourced directly for retail distribution.'}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedProduct.category_name || 'General Wholesale'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Packaging Unit</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedProduct.unit || 'Carton / Pcs'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Min Order Qty (MOQ)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedProduct.minimum_order_quantity || 1} {selectedProduct.unit || 'units'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Warehouse Stock</span>
                    <span className={`font-semibold ${parseInt(selectedProduct.available_stock ?? selectedProduct.current_stock ?? 0, 10) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                      {parseInt(selectedProduct.available_stock ?? selectedProduct.current_stock ?? 0, 10)} Available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Details Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Exclusive Store Rate</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
                      ₹{parseFloat(selectedProduct.final_price || selectedProduct.selling_price || 0).toFixed(2)}
                    </span>
                    {parseFloat(selectedProduct.standard_price || 0) > parseFloat(selectedProduct.final_price || selectedProduct.selling_price || 0) && (
                      <span className="text-sm text-slate-400 line-through">
                        MRP ₹{parseFloat(selectedProduct.standard_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Applicable GST</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {selectedProduct.tax_rate || 0}% ({((parseFloat(selectedProduct.final_price || selectedProduct.selling_price || 0) * (selectedProduct.tax_rate || 0)) / 100).toFixed(2)} / unit)
                  </p>
                </div>
              </div>

              {/* Quick Stepper & Add */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900">
                  <button
                    type="button"
                    disabled={(quantities[selectedProduct.id] || selectedProduct.minimum_order_quantity || 1) <= (selectedProduct.minimum_order_quantity || 1)}
                    onClick={() => handleQtyChange(selectedProduct.id, -1, selectedProduct.minimum_order_quantity || 1, selectedProduct.available_stock || 9999)}
                    className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-slate-800 dark:text-white">
                    {quantities[selectedProduct.id] || selectedProduct.minimum_order_quantity || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(selectedProduct.id, 1, selectedProduct.minimum_order_quantity || 1, selectedProduct.available_stock || 9999)}
                    className="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <Button
                  variant="primary"
                  className="flex-1 font-bold py-2.5"
                  icon={ShoppingCart}
                  disabled={parseInt(selectedProduct.available_stock ?? selectedProduct.current_stock ?? 0, 10) <= 0}
                  onClick={() => {
                    const q = quantities[selectedProduct.id] || selectedProduct.minimum_order_quantity || 1;
                    addItem(selectedProduct, q);
                    setSelectedProduct(null);
                  }}
                >
                  Add {quantities[selectedProduct.id] || selectedProduct.minimum_order_quantity || 1} to Cart (₹{(parseFloat(selectedProduct.final_price || selectedProduct.selling_price || 0) * (quantities[selectedProduct.id] || selectedProduct.minimum_order_quantity || 1)).toFixed(2)})
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ShopProducts;
