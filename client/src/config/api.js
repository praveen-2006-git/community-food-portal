// Centralized API configuration supporting dynamic environment base URLs
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (isLocal ? 'http://localhost:5000' : 'https://community-food-portal.onrender.com');

export default API_BASE_URL;

