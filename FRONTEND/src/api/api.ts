import axios from 'axios';
import { useStore } from '../useStore'; // adjust path if needed

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Get token from your auth store – adjust based on your store structure
  const token = useStore.getState().token; // or use a separate auth store
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      useStore.getState().logout?.(); // if you have a logout action
    }
    return Promise.reject(error);
  }
);

export default api;