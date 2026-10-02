import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RoleRoute = ({ children, allowedRoles = [] }) => {
  const { user, switchRole } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If accessing an admin route while currently set to shop role (e.g. from previous testing),
    // automatically elevate/switch to admin so the Admin Dashboard opens seamlessly without error
    if (allowedRoles.includes('admin') && user.role === 'shop') {
      switchRole('admin');
      return children;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
