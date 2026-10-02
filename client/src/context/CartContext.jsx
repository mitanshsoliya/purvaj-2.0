import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { addToast } = useToast();

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('purvaj_shop_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load cart from storage', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('purvaj_shop_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  }, [items]);

  const addItem = (product, requestedQty) => {
    const moq = parseInt(product.minimum_order_quantity || product.moq || 1, 10);
    const stock = parseInt(product.available_stock ?? product.current_stock ?? 9999, 10);
    const price = parseFloat(product.final_price || product.selling_price || product.unit_price || 0);
    const standardPrice = parseFloat(product.standard_price || product.selling_price || price);
    const taxRate = parseFloat(product.tax_rate || 0);

    const initialQty = requestedQty ? parseInt(requestedQty, 10) : moq;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);

      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + (requestedQty ? parseInt(requestedQty, 10) : 1);

        if (stock > 0 && newQty > stock) {
          addToast?.(`Only ${stock} units available in warehouse for ${product.name}`, 'warning');
          return prev;
        }

        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          price,
          taxRate,
          stock,
        };
        addToast?.(`Updated ${product.name} quantity to ${newQty}`, 'info');
        return updated;
      }

      if (stock > 0 && initialQty > stock) {
        addToast?.(`Only ${stock} units available for ${product.name}`, 'warning');
        return prev;
      }

      const newItem = {
        id: product.id,
        name: product.name,
        sku: product.sku || '',
        image: product.image || null,
        price,
        standardPrice,
        taxRate,
        moq,
        stock,
        quantity: Math.max(initialQty, moq),
        unit: product.unit || 'pcs',
      };

      addToast?.(`Added ${product.name} to cart`, 'success');
      return [...prev, newItem];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          if (item.stock > 0 && qty > item.stock) {
            addToast?.(`Maximum available stock is ${item.stock}`, 'warning');
            return { ...item, quantity: item.stock };
          }
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => {
      const filtered = prev.filter((item) => item.id !== productId);
      addToast?.('Item removed from cart', 'info');
      return filtered;
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  // Reorder helper: replace or append items with validation
  const loadOrderItemsIntoCart = (orderItems, mode = 'replace') => {
    const formatted = orderItems.map((oi) => ({
      id: oi.product_id || oi.id,
      name: oi.product_name || oi.name,
      sku: oi.sku || '',
      image: oi.product_image || oi.image || null,
      price: parseFloat(oi.unit_price || oi.price || 0),
      standardPrice: parseFloat(oi.unit_price || oi.price || 0),
      taxRate: parseFloat(oi.tax_rate || 0),
      moq: parseInt(oi.minimum_order_quantity || 1, 10),
      stock: parseInt(oi.available_stock ?? 999, 10),
      quantity: parseInt(oi.quantity || 1, 10),
      unit: oi.unit || 'pcs',
    }));

    if (mode === 'replace') {
      setItems(formatted);
    } else {
      setItems((prev) => {
        const combined = [...prev];
        formatted.forEach((f) => {
          const idx = combined.findIndex((c) => c.id === f.id);
          if (idx > -1) {
            combined[idx].quantity += f.quantity;
          } else {
            combined.push(f);
          }
        });
        return combined;
      });
    }
    addToast?.(`Loaded ${formatted.length} items into cart`, 'success');
  };

  // Calculations
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctCount = items.length;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const taxBreakdown = items.reduce((acc, item) => {
    const itemSub = item.price * item.quantity;
    const taxAmt = (itemSub * item.taxRate) / 100;
    const rateKey = `${item.taxRate}%`;
    acc[rateKey] = (acc[rateKey] || 0) + taxAmt;
    return acc;
  }, {});

  const taxTotal = Object.values(taxBreakdown).reduce((sum, val) => sum + val, 0);
  const grandTotal = subtotal + taxTotal;

  // Validation checks
  const moqViolations = items.filter((item) => item.quantity < item.moq);
  const stockViolations = items.filter((item) => item.stock > 0 && item.quantity > item.stock);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        distinctCount,
        subtotal,
        taxTotal,
        taxBreakdown,
        grandTotal,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        loadOrderItemsIntoCart,
        moqViolations,
        stockViolations,
        isValidForCheckout: items.length > 0 && moqViolations.length === 0 && stockViolations.length === 0,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
