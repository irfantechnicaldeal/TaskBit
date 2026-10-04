// Automatically detects if running in production (Vercel) or local development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://your-backend-service.onrender.com/api' : 'http://localhost:5000/api');
