// Set VITE_API_BASE_URL in the admin panel host to the backend API origin plus /api.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://your-backend-service.onrender.com/api' : 'http://localhost:5000/api');
