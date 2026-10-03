import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Zap,
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { getImageUrl } from '../../utils/imageUrl';

export const ShopQuickOrder = () => {
  const { addItem, cartCount } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Selected quick order rows: [{ product, quantity }]
  const [orderRows, setOrderRows] = useState([]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/products?search=${encodeURIComponent(searchQuery)}&limit=8&status=active`);
        if (res.data?.success && res.data?.data) {
          setSearchResults(res.data.data.products || []);
        }
      } catch (err) {
        console.error('Quick order search failed', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectProduct = (product) => {
    const moq = parseInt(product.minimum_order_quantity || 1, 10);
    const existingIndex = orderRows.findIndex((r) => r.product.id === product.id);

    if (existingIndex > -1) {
      // Increment
      setOrderRows((prev) => {
        const updated = [...prev];
        updated[existingIndex].quantity += moq;
        return updated;
      });
      addToast(`Updated quantity for ${product.name}`, 'info');
    } else {
      setOrderRows((prev) => [...prev, { product, quantity: moq }]);
      addToast(`Added ${product.name} to bulk list`, 'success');
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUpdateQty = (index, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    setOrderRows((prev) => {
      const updated = [...prev];
      const prod = updated[index].product;
      const stock = parseInt(prod.available_stock ?? prod.current_stock ?? 9999, 10);
      if (stock > 0 && qty > stock) {
        addToast(`Only ${stock} available in warehouse`, 'warning');
        updated[index].quantity = stock;
      } else {
        updated[index].quantity = qty;
      }
      return updated;
    });
  };

  const handleRemoveRow = (index) => {
    setOrderRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAllToCart = () => {
    if (orderRows.length === 0) return;

    orderRows.forEach((row) => {
      addItem(row.product, row.quantity);
    });

    addToast(`Added ${orderRows.length} items to cart!`, 'success');
    navigate('/shop/cart');
  };

  // Calculations
  const totalSubtotal = orderRows.reduce((sum, r) => {
    const price = parseFloat(r.product.final_price || r.product.selling_price || 0);
    return sum + price * r.quantity;
  }, 0);

  const totalEstTax = orderRows.reduce((sum, r) => {
    const price = parseFloat(r.product.final_price || r.product.selling_price || 0);
    const taxRate = parseFloat(r.product.tax_rate || 0);
    return sum + (price * r.quantity * taxRate) / 100;
  }, 0);

  const totalEstAmount = totalSubtotal + totalEstTax;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500 text-white">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quick Bulk Order
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fast SKU & barcode lookup. Enter quantities and add your entire stock list in 1-click.
          </p>
        </div>

        <Link to="/shop/cart">
          <Button variant="secondary" size="sm" icon={ShoppingCart}>
            View Cart ({cartCount})
          </Button>
        </Link>
      </div>

      {/* Search Input with Instant Autocomplete Dropdown */}
      <div className="relative">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Search & Add Product by Name or SKU
          </label>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Parle-G, Maggi 70g, SKU: PARLE-G-80G..."
              className="w-full pl-11 pr-4 py-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 font-medium"
              autoFocus
            />
            {searching && (
              <RefreshCw className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-soft-xl max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {searchResults.map((p) => {
                const price = parseFloat(p.final_price || p.selling_price || 0);
                const stock = parseInt(p.available_stock ?? p.current_stock ?? 0, 10);
                const moq = parseInt(p.minimum_order_quantity || 1, 10);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {p.image ? (
                          <img
                            src={getImageUrl(p.image)}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          SKU: {p.sku} • MOQ: {moq} • Stock: {stock}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        ₹{price.toFixed(2)}
                      </p>
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 mt-0.5 justify-end">
                        <Plus className="w-3 h-3" /> Select
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Items Manifest */}
      <Card
        title={`Bulk Order Items (${orderRows.length})`}
        subtitle="Review units before adding to wholesale cart"
        action={
          orderRows.length > 0 && (
            <button
              onClick={() => setOrderRows([])}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
            >
              Clear List
            </button>
          )
        }
      >
        {orderRows.length === 0 ? (
          <div className="py-12 text-center">
            <Zap className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Items Added Yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Type any product name or SKU in the search bar above to instantly add items to your quick bulk requisition.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* List for Mobile, Table for Desktop */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {orderRows.map((row, idx) => {
                const { product, quantity } = row;
                const price = parseFloat(product.final_price || product.selling_price || 0);
                const moq = parseInt(product.minimum_order_quantity || 1, 10);
                const stock = parseInt(product.available_stock ?? product.current_stock ?? 0, 10);
                const rowTotal = price * quantity;

                return (
                  <div key={product.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                            }}
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          SKU: {product.sku} • ₹{price.toFixed(2)} / unit
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {/* Quantity input */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 sm:hidden">Qty:</span>
                        <input
                          type="number"
                          min={moq}
                          max={stock > 0 ? stock : undefined}
                          value={quantity}
                          onChange={(e) => handleUpdateQty(idx, e.target.value)}
                          className="w-20 px-2 py-1.5 text-center text-xs font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                        />
                        <span className="text-[11px] text-slate-400">
                          {product.unit || 'pcs'}
                        </span>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-[90px]">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          ₹{rowTotal.toFixed(2)}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          +{product.tax_rate || 0}% GST
                        </span>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Summary Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estimated Total (incl. GST):
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  ₹{totalEstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                icon={ShoppingCart}
                onClick={handleAddAllToCart}
                className="bg-brand-600 hover:bg-brand-500 font-bold shadow-soft"
              >
                Add All {orderRows.length} Items to Cart ➔
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ShopQuickOrder;
