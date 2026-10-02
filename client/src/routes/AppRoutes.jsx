import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Route Guards
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { useAuth } from '../context/AuthContext';

// Auth & Common Pages
import Login from '../pages/auth/Login';
import NotFound from '../pages/common/NotFound';
import Unauthorized from '../pages/common/Unauthorized';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminCategories from '../pages/admin/AdminCategories';
import AdminBrands from '../pages/admin/AdminBrands';
import AdminPricing from '../pages/admin/AdminPricing';
import AdminInventory from '../pages/admin/AdminInventory';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminBilling from '../pages/admin/AdminBilling';
import AdminShops from '../pages/admin/AdminShops';
import AdminPayments from '../pages/admin/AdminPayments';
import AdminOffers from '../pages/admin/AdminOffers';
import AdminReturns from '../pages/admin/AdminReturns';
import AdminDelivery from '../pages/admin/AdminDelivery';
import AdminCommunication from '../pages/admin/AdminCommunication';
import AdminReports from '../pages/admin/AdminReports';
import AdminStaff from '../pages/admin/AdminStaff';
import AdminSettings from '../pages/admin/AdminSettings';

// Shop Pages
import ShopDashboard from '../pages/shop/ShopDashboard';
import ShopProducts from '../pages/shop/ShopProducts';
import ShopQuickOrder from '../pages/shop/ShopQuickOrder';
import ShopCart from '../pages/shop/ShopCart';
import ShopOrders from '../pages/shop/ShopOrders';
import ShopReorder from '../pages/shop/ShopReorder';
import ShopBills from '../pages/shop/ShopBills';
import ShopPayments from '../pages/shop/ShopPayments';
import ShopOutstanding from '../pages/shop/ShopOutstanding';
import ShopNotifications from '../pages/shop/ShopNotifications';
import ShopOffers from '../pages/shop/ShopOffers';
import ShopProfile from '../pages/shop/ShopProfile';
import ShopHelp from '../pages/shop/ShopHelp';

// Root redirector based on authenticated user's role
const RootRedirector = () => {
  const { isShop, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isShop ? '/shop' : '/admin'} replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public / Auth routes */}
      <Route path="/" element={<RootRedirector />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Admin Shell & Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <AppShell role="admin" />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        
        {/* Catalog */}
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="brands" element={<AdminBrands />} />
        <Route path="pricing" element={<AdminPricing />} />

        {/* Inventory */}
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="inventory/stock-in" element={<AdminInventory />} />
        <Route path="inventory/adjustment" element={<AdminInventory />} />
        <Route path="inventory/history" element={<AdminInventory />} />
        <Route path="inventory/low-stock" element={<AdminInventory />} />

        {/* Orders */}
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/pending" element={<AdminOrders />} />
        <Route path="orders/confirmed" element={<AdminOrders />} />
        <Route path="orders/processing" element={<AdminOrders />} />
        <Route path="orders/dispatched" element={<AdminOrders />} />
        <Route path="orders/delivered" element={<AdminOrders />} />
        <Route path="orders/cancelled" element={<AdminOrders />} />
        <Route path="orders/returns" element={<AdminOrders />} />

        {/* Billing */}
        <Route path="billing" element={<AdminBilling />} />
        <Route path="billing/create" element={<AdminBilling />} />
        <Route path="billing/receipts" element={<AdminBilling />} />

        {/* Shops */}
        <Route path="shops" element={<AdminShops />} />
        <Route path="shops/pending" element={<AdminShops />} />
        <Route path="shops/active" element={<AdminShops />} />
        <Route path="shops/blocked" element={<AdminShops />} />
        <Route path="shops/groups" element={<AdminShops />} />

        {/* Payments */}
        <Route path="payments" element={<AdminPayments />} />
        <Route path="payments/outstanding" element={<AdminPayments />} />
        <Route path="payments/credit" element={<AdminPayments />} />
        <Route path="payments/history" element={<AdminPayments />} />

        {/* Extended Wholesale Operations */}
        <Route path="offers" element={<AdminOffers />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="delivery" element={<AdminDelivery />} />
        <Route path="communication" element={<AdminCommunication />} />
        <Route path="communication/notifications" element={<AdminCommunication />} />
        <Route path="communication/history" element={<AdminCommunication />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="staff" element={<AdminStaff />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Shop Portal Shell & Protected Routes */}
      <Route
        path="/shop"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['shop', 'admin']}>
              <AppShell role="shop" />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<ShopDashboard />} />
        <Route path="products" element={<ShopProducts />} />
        <Route path="quick-order" element={<ShopQuickOrder />} />
        <Route path="cart" element={<ShopCart />} />
        <Route path="orders" element={<ShopOrders />} />
        <Route path="reorder" element={<ShopReorder />} />
        <Route path="bills" element={<ShopBills />} />
        <Route path="payments" element={<ShopPayments />} />
        <Route path="outstanding" element={<ShopOutstanding />} />
        <Route path="notifications" element={<ShopNotifications />} />
        <Route path="offers" element={<ShopOffers />} />
        <Route path="profile" element={<ShopProfile />} />
        <Route path="help" element={<ShopHelp />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
