import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { user, switchRole, isAdmin, isShop } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required access
  const hasAccess =
    (allowedRoles.includes('admin') && isAdmin) ||
    (allowedRoles.includes('shop') && isShop) ||
    allowedRoles.includes(user.role);

  if (!hasAccess) {
    // If accessing an admin route while currently set to shop role,
    // automatically switch to admin so the Admin Dashboard opens seamlessly
    if (allowedRoles.includes('admin') && isShop) {
      switchRole('admin');
      return children;
    }
    if (allowedRoles.includes('shop') && isAdmin) {
      switchRole('shop');
      return children;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
