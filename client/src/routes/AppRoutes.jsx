import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Route Guards
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import { useAuth } from '../context/AuthContext';
import { PageSkeleton } from '../components/common/Skeleton';

// Auth & Common Pages (lazy loaded)
const Login = lazy(() => import('../pages/auth/Login'));
const NotFound = lazy(() => import('../pages/common/NotFound'));
const Unauthorized = lazy(() => import('../pages/common/Unauthorized'));

// Admin Pages (lazy loaded for optimal bundle splitting)
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('../pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('../pages/admin/AdminCategories'));
const AdminBrands = lazy(() => import('../pages/admin/AdminBrands'));
const AdminPricing = lazy(() => import('../pages/admin/AdminPricing'));
const AdminInventory = lazy(() => import('../pages/admin/AdminInventory'));
const AdminOrders = lazy(() => import('../pages/admin/AdminOrders'));
const AdminBilling = lazy(() => import('../pages/admin/AdminBilling'));
const AdminShops = lazy(() => import('../pages/admin/AdminShops'));
const AdminPayments = lazy(() => import('../pages/admin/AdminPayments'));
const AdminOffers = lazy(() => import('../pages/admin/AdminOffers'));
const AdminReturns = lazy(() => import('../pages/admin/AdminReturns'));
const AdminDelivery = lazy(() => import('../pages/admin/AdminDelivery'));
const AdminCommunication = lazy(() => import('../pages/admin/AdminCommunication'));
const AdminReports = lazy(() => import('../pages/admin/AdminReports'));
const AdminStaff = lazy(() => import('../pages/admin/AdminStaff'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));

// Shop Pages (lazy loaded)
const ShopDashboard = lazy(() => import('../pages/shop/ShopDashboard'));
const ShopProducts = lazy(() => import('../pages/shop/ShopProducts'));
const ShopQuickOrder = lazy(() => import('../pages/shop/ShopQuickOrder'));
const ShopCart = lazy(() => import('../pages/shop/ShopCart'));
const ShopOrders = lazy(() => import('../pages/shop/ShopOrders'));
const ShopReorder = lazy(() => import('../pages/shop/ShopReorder'));
const ShopBills = lazy(() => import('../pages/shop/ShopBills'));
const ShopPayments = lazy(() => import('../pages/shop/ShopPayments'));
const ShopOutstanding = lazy(() => import('../pages/shop/ShopOutstanding'));
const ShopNotifications = lazy(() => import('../pages/shop/ShopNotifications'));
const ShopOffers = lazy(() => import('../pages/shop/ShopOffers'));
const ShopProfile = lazy(() => import('../pages/shop/ShopProfile'));
const ShopHelp = lazy(() => import('../pages/shop/ShopHelp'));

// Root redirector based on authenticated user's role
const RootRedirector = () => {
  const { isShop, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isShop ? '/shop' : '/admin'} replace />;
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<PageSkeleton />}>
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
    </Suspense>
  );
};

export default AppRoutes;
