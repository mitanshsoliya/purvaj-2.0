import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

const ADMIN_ROLES = ['admin', 'super_admin'];
const SHOP_ROLES = ['shop_owner', 'shop_staff', 'shop'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('purvaj_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'super_admin') parsed.role = 'admin';
        return parsed;
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    return {
      id: 'a0000001-0000-0000-0000-000000000001',
      name: 'Mitansh Soliya',
      email: 'admin@purvaj.com',
      role: 'admin',
      warehouse: 'Main Central Warehouse',
      avatar: null,
    };
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('purvaj_token') || 'demo_jwt_token_purvaj_2.0';
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('purvaj_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('purvaj_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('purvaj_token', token);
    } else {
      localStorage.removeItem('purvaj_token');
    }
  }, [token]);

  // Attempt to sync current user profile from DB on mount
  useEffect(() => {
    const syncCurrentUser = async () => {
      const savedToken = localStorage.getItem('purvaj_token');
      if (savedToken && !savedToken.startsWith('demo_') && !savedToken.startsWith('jwt_')) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user);
          }
        } catch (err) {
          console.warn('[AuthContext] Session verification check:', err.response?.data?.message || err.message);
        }
      }
    };
    syncCurrentUser();
  }, []);

  const login = async ({ email, password, role = 'admin' }) => {
    setLoading(true);
    try {
      // 1. Try real backend authentication
      try {
        const response = await api.post('/auth/login', { email, password });
        if (response.data?.success && response.data?.data) {
          const { user: serverUser, accessToken, refreshToken } = response.data.data;
          setUser(serverUser);
          setToken(accessToken);
          if (refreshToken) {
            localStorage.setItem('purvaj_refresh_token', refreshToken);
          }
          return { success: true, user: serverUser };
        }
      } catch (backendError) {
        // If the backend gave a specific 4xx error (e.g. pending approval, blocked, invalid password)
        if (backendError.response?.data?.message) {
          throw new Error(backendError.response.data.message);
        }
        // If connection refused / network error, fall through to simulation
        if (backendError.code !== 'ERR_NETWORK' && backendError.code !== 'ECONNREFUSED') {
          throw backendError;
        }
        console.warn('Backend server offline, falling back to local simulation');
      }

      // 2. Fallback simulation (offline mode)
      const simulatedUser = role === 'admin'
        ? {
            id: 'a0000001-0000-0000-0000-000000000001',
            name: 'Mitansh Soliya',
            email: email || 'admin@purvaj.com',
            role: 'admin',
            warehouse: 'Main Central Warehouse',
          }
        : {
            id: 'b0000001-0000-0000-0000-000000000001',
            name: 'Ramesh Patel',
            shopName: 'Shree Krishna Traders',
            email: email || 'ramesh@sktraders.com',
            role: 'shop_owner',
            shop: {
              id: 'c0000001-0000-0000-0000-000000000001',
              shop_name: 'Shree Krishna Traders',
              credit_limit: 250000,
              credit_used: 0,
              city: 'Ahmedabad',
            },
          };

      const simulatedToken = `jwt_${role}_${Date.now()}`;
      setUser(simulatedUser);
      setToken(simulatedToken);
      return { success: true, user: simulatedUser };
    } finally {
      setLoading(false);
    }
  };

  const registerShop = async (shopData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', shopData);
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('purvaj_user');
    localStorage.removeItem('purvaj_token');
    localStorage.removeItem('purvaj_refresh_token');
    api.post('/auth/logout').catch(() => {});
  };

  const switchRole = (newRole) => {
    const newUser = newRole === 'admin'
      ? {
          id: 'a0000001-0000-0000-0000-000000000001',
          name: 'Mitansh Soliya',
          email: 'admin@purvaj.com',
          role: 'admin',
          warehouse: 'Main Central Warehouse',
        }
      : {
          id: 'b0000001-0000-0000-0000-000000000001',
          name: 'Ramesh Patel',
          shopName: 'Shree Krishna Traders',
          email: 'ramesh@sktraders.com',
          role: 'shop_owner',
          shop: {
            id: 'c0000001-0000-0000-0000-000000000001',
            shop_name: 'Shree Krishna Traders',
            credit_limit: 250000,
            credit_used: 0,
            city: 'Ahmedabad',
          },
        };

    const newToken = newRole === 'admin'
      ? 'demo_jwt_token_purvaj_2.0'
      : 'jwt_shop_b0000001';

    setUser(newUser);
    setToken(newToken);
    try {
      localStorage.setItem('purvaj_user', JSON.stringify(newUser));
      localStorage.setItem('purvaj_token', newToken);
    } catch (e) {
      console.error('Failed to update purvaj_user in localStorage', e);
    }
    return newUser;
  };

  const isAdmin = ADMIN_ROLES.includes(user?.role) || user?.role === 'admin';
  const isShop = SHOP_ROLES.includes(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAdmin,
        isShop,
        login,
        registerShop,
        logout,
        switchRole,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
