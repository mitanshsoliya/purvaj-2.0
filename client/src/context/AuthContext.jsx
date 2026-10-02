import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('purvaj_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    // Default initial mock user for seamless demonstration
    return {
      id: 'usr_admin_01',
      name: 'Purvaj Admin',
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

  const login = async ({ email, password, role = 'admin' }) => {
    setLoading(true);
    try {
      // Future: connect with backend /api/auth/login
      const simulatedUser = role === 'admin'
        ? {
            id: 'usr_admin_01',
            name: 'Purvaj Admin',
            email: email || 'admin@purvaj.com',
            role: 'admin',
            warehouse: 'Main Central Warehouse',
          }
        : {
            id: 'usr_shop_102',
            name: 'Ramesh Patel',
            shopName: 'Shree Krishna Traders',
            email: email || 'sk.traders@purvaj.shop',
            role: 'shop',
            gstin: '24AAACP1234M1Z2',
            creditLimit: 250000,
            city: 'Ahmedabad',
          };

      const simulatedToken = `jwt_${role}_${Date.now()}`;
      setUser(simulatedUser);
      setToken(simulatedToken);
      return { success: true, user: simulatedUser };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('purvaj_user');
    localStorage.removeItem('purvaj_token');
  };

  const switchRole = (newRole) => {
    const newUser = newRole === 'admin'
      ? {
          id: 'usr_admin_01',
          name: 'Purvaj Admin',
          email: 'admin@purvaj.com',
          role: 'admin',
          warehouse: 'Main Central Warehouse',
        }
      : {
          id: 'usr_shop_102',
          name: 'Ramesh Patel',
          shopName: 'Shree Krishna Traders',
          email: 'sk.traders@purvaj.shop',
          role: 'shop',
          gstin: '24AAACP1234M1Z2',
          creditLimit: 250000,
          city: 'Ahmedabad',
        };

    setUser(newUser);
    try {
      localStorage.setItem('purvaj_user', JSON.stringify(newUser));
    } catch (e) {
      console.error('Failed to update purvaj_user in localStorage', e);
    }
    return newUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        isShop: user?.role === 'shop',
        login,
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
