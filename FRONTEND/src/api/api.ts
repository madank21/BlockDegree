// FRONTEND/src/api/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { useStore } from '../useStore'; // adjust path if your store is elsewhere

// 1. Create axios instance with base URL from environment
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 seconds
});

// 2. Request interceptor: attach JWT token from store
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from Zustand store (or replace with your auth hook)
    const token = useStore.getState().token; // ensure your store has `token`
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If the body is FormData, remove the 'Content-Type' header so the browser can set it with the correct boundary.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response interceptor: handle 401 Unauthorized globally
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    // If the error is 401 and we have a logout function in the store, call it
    if (error.response?.status === 401) {
      const logout = useStore.getState().logout; // ensure your store has `logout`
      if (logout) {
        logout(); // clears token and user data
        // Optionally redirect to login page (if using React Router)
        // window.location.href = '/login';
      }
    }

    // Extract a meaningful error message from the response, or fallback
    const message =
      (error.response?.data as any)?.message ||
      error.message ||
      'An unexpected error occurred.';

    // Reject with a custom error object to preserve status and data
    return Promise.reject({
      status: error.response?.status,
      message,
      data: error.response?.data,
    });
  }
);

// 4. Convenience methods with generics for typed responses
export const apiGet = <T = any>(url: string, config = {}) =>
  api.get<T>(url, config).then((res) => res.data);

export const apiPost = <T = any>(url: string, data: any, config = {}) =>
  api.post<T>(url, data, config).then((res) => res.data);

export const apiPut = <T = any>(url: string, data: any, config = {}) =>
  api.put<T>(url, data, config).then((res) => res.data);

export const apiPatch = <T = any>(url: string, data: any, config = {}) =>
  api.patch<T>(url, data, config).then((res) => res.data);

export const apiDelete = <T = any>(url: string, config = {}) =>
  api.delete<T>(url, config).then((res) => res.data);

// 5. Optional: for direct form‑data uploads, you can use api.post with FormData
// Example:
// const formData = new FormData();
// formData.append('file', file);
// const result = await apiPost('/documents/upload', formData, {
//   headers: { 'Content-Type': 'multipart/form-data' } // axios will auto‑remove if we use FormData?
// });
// But our interceptor already removes Content-Type for FormData,
// so you can simply do: apiPost('/documents/upload', formData)

// 6. Export the raw axios instance as well (if needed)
export default api;