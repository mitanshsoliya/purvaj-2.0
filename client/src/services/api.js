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

// Response interceptor for centralized error handling & storing cache
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
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized request. Session may be expired.');
    }
    return Promise.reject(error);
  }
);

export default api;
