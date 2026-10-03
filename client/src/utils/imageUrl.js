/**
 * PURVAJ 2.0 — Image URL Helper
 * Safely resolves product image URLs whether they are:
 * 1. Base64 Data URLs ('data:image/...')
 * 2. Blob URLs ('blob:...')
 * 3. Relative server uploads ('/uploads/...')
 * 4. Full backend URLs ('http://localhost:5000/uploads/...')
 * 5. External CDN URLs ('https://images.unsplash.com/...')
 */

export const getImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  // Data URLs and Blob URLs are used as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Relative upload URLs -> prefix with backend URL if needed
  if (trimmed.startsWith('/uploads')) {
    // If running in development with proxy, or relative root
    const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    return `${backendBase}${trimmed}`;
  }

  return trimmed;
};

export default getImageUrl;
