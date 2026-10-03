import axios from 'axios';

// In-memory cache map for GET requests
const requestCache = new Map();

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Cache clearer function
export const clearApiCache = (urlPrefix = '') => {
  if (!urlPrefix) {
    requestCache.clear();
  } else {
    for (const key of requestCache.keys()) {
      if (key.includes(urlPrefix)) {
        requestCache.delete(key);
      }
    }
  }
};

// Request interceptor to attach JWT token & check cache
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('purvaj_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Cache check for GET requests if cacheTTL is specified or for common static endpoints
    if (config.method?.toLowerCase() === 'get' && config.cacheTTL) {
      const cacheKey = `${config.url}_${JSON.stringify(config.params || {})}`;
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < config.cacheTTL) {
        // Return resolved cached response
        config.adapter = () =>
          Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK (from cache)',
            headers: cached.headers,
            config,
          });
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh queue management to handle concurrent 401 requests smoothly
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for centralized error handling, token refresh & cache
api.interceptors.response.use(
  (response) => {
    const config = response.config;
    // Store in cache if configured
    if (config?.method?.toLowerCase() === 'get' && config.cacheTTL && response.status === 200) {
      const cacheKey = `${config.url}_${JSON.stringify(config.params || {})}`;
      requestCache.set(cacheKey, {
        data: response.data,
        headers: response.headers,
        timestamp: Date.now(),
      });
    }

    // Invalidate cache on mutations (POST, PUT, PATCH, DELETE)
    if (['post', 'put', 'patch', 'delete'].includes(config?.method?.toLowerCase())) {
      clearApiCache();
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and not already retried
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const url = originalRequest.url || '';

      // Skip refresh attempt for auth endpoints to prevent infinite loops
      if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('purvaj_refresh_token');

      // If no refresh token exists, clear expired session & redirect to login
      if (!refreshToken) {
        localStorage.removeItem('purvaj_token');
        localStorage.removeItem('purvaj_refresh_token');
        localStorage.removeItem('purvaj_user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('purvaj_auth_logout'));
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?expired=1';
          }
        }
        return Promise.reject(error);
      }

      // If another request is already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });

        const resData = refreshResponse.data?.data;
        const newAccessToken = resData?.accessToken;
        const newRefreshToken = resData?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('purvaj_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('purvaj_refresh_token', newRefreshToken);
          }

          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('purvaj_token_refreshed', { detail: { token: newAccessToken } })
            );
          }

          return api(originalRequest);
        } else {
          throw new Error('Refresh response missing access token');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('purvaj_token');
        localStorage.removeItem('purvaj_refresh_token');
        localStorage.removeItem('purvaj_user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('purvaj_auth_logout'));
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?expired=1';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
