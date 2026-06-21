// FRONTEND/src/api/api.ts
//
// Single source of truth for all backend calls. No page or lib file should
// call Supabase directly for mutations, and nothing in the browser should
// call the blockchain directly — everything routes through here, which
// talks to BACKEND/app.js (/api/v1/...).
//
// Usage:
//   import { authApi, degreesApi, verificationApi, blockchainApi, documentsApi, usersApi, auditApi, fraudApi } from '@/api/api';
//   const result = await degreesApi.issue({ ... });
//   const data = await verificationApi.verifyPublic(hash);
//   const uploadRes = await documentsApi.upload(formData);

// ----------------------------------------------------------------------
// 1. Environment & token
// ----------------------------------------------------------------------

// Use environment variable if set, otherwise fallback to localhost:5001
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Token storage – adjust the key to match your login implementation
const TOKEN_KEY = 'token'; // or 'accessToken', 'auth_token', etc.

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ----------------------------------------------------------------------
// 2. Custom error class
// ----------------------------------------------------------------------

export class ApiError extends Error {
  public status: number;
  public payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

// ----------------------------------------------------------------------
// 3. Core request helpers
// ----------------------------------------------------------------------

/**
 * Performs a JSON request (GET, POST, PUT, PATCH, DELETE) – body will be JSON.stringify'd.
 */
async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Parse response body (could be JSON, text, or empty)
  let body: unknown = null;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    body = await res.json();
  } else if (contentType?.includes('text/')) {
    body = await res.text();
  } else {
    // For 204 No Content etc.
    body = undefined;
  }

  if (!res.ok) {
    const message =
      (body as any)?.message || (body as any)?.error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  // Unwrap the data envelope if present
  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    (body as any).success === true &&
    'data' in body
  ) {
    return (body as any).data as T;
  }
  return body as T;
}

/**
 * Performs a multipart/form-data POST (for file uploads).
 * Do NOT set Content-Type – the browser will add the correct boundary.
 */
async function postForm<T = any>(path: string, formData: FormData): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  let body: unknown = null;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const message =
      (body as any)?.message || (body as any)?.error || `Upload failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  // Unwrap the data envelope if present
  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    (body as any).success === true &&
    'data' in body
  ) {
    return (body as any).data as T;
  }
  return body as T;
}

// ----------------------------------------------------------------------
// 4. Convenience methods (GET, POST, PUT, PATCH, DELETE)
// ----------------------------------------------------------------------

const get = <T = any>(path: string) => request<T>(path, { method: 'GET' });
const post = <T = any>(path: string, data?: unknown) =>
  request<T>(path, {
    method: 'POST',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
const put = <T = any>(path: string, data?: unknown) =>
  request<T>(path, {
    method: 'PUT',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
const patch = <T = any>(path: string, data?: unknown) =>
  request<T>(path, {
    method: 'PATCH',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
const del = <T = any>(path: string, data?: unknown) =>
  request<T>(path, {
    method: 'DELETE',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

// ----------------------------------------------------------------------
// 5. API endpoint groups
// ----------------------------------------------------------------------

// --- Auth -----------------------------------------------------------------
export const authApi = {
  login: (email: string, password: string) =>
    post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { email, password }),
  register: (payload: Record<string, unknown>) =>
    post<{ accessToken?: string; refreshToken?: string; user: any }>('/auth/register', payload),
  refresh: () => post<{ accessToken: string }>('/auth/refresh-token'),
};

// --- Users -------------------------------------------------------------
export const usersApi = {
  // List users with optional filters (role, search, etc.)
  list: (params?: { role?: string; page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    const qs = query.toString();
    return get<{ users: any[]; total: number }>(`/users${qs ? '?' + qs : ''}`);
  },
  getById: (id: string) => get<{ user: any }>(`/users/${id}`),
  update: (id: string, payload: Record<string, unknown>) =>
    patch<{ success: boolean }>(`/users/${id}`, payload),
  delete: (id: string) => del<{ success: boolean }>(`/users/${id}`),
};

// --- Degrees -------------------------------------------------------------
export const degreesApi = {
  issue: (payload: Record<string, unknown>) =>
    post<{ degreeHash: string; qrCodeUrl: string; degreeId: string }>(
      '/degrees',
      payload
    ),
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return get<{ degrees: any[]; total: number }>(`/degrees${qs ? '?' + qs : ''}`);
  },
  getById: (id: string) => get<{ degree: any }>(`/degrees/${id}`),
  getQr: (id: string) => get<{ qrUrl: string }>(`/degrees/${id}/qr`),
  revoke: (id: string, reason: string) =>
    del<{ success: boolean }>(`/degrees/${id}/revoke`, { reason }),
  publicLookup: (id: string) => get<{ degree: any }>(`/degrees/public/${id}`),
  update: (id: string, payload: Record<string, unknown>) =>
    patch<{ success: boolean }>(`/degrees/${id}`, payload),
};

// --- Verification -------------------------------------------------------
export const verificationApi = {
  request: (payload: Record<string, unknown>) =>
    post<{ verificationId: string; status: string }>('/verification', payload),
  verifyPublic: (hash: string) =>
    get<{
      valid: boolean;
      degreeDetails?: any;
      blockchain: { confirmed: boolean; txHash?: string };
    }>(`/verification/public/${encodeURIComponent(hash)}`),
  getById: (id: string) =>
    get<{ verification: any }>(`/verification/${id}`),
  getByCode: (code: string) =>
    get<{ verification: any }>(`/verification/code/${encodeURIComponent(code)}`),
};

// --- Blockchain (read-only, server-proxied) ----------------------------
export const blockchainApi = {
  network: () => get<{ chainId: number; gasPrice: string; blockNumber: number }>(
    '/blockchain/network'
  ),
  totalDegrees: () => get<{ total: number }>('/blockchain/total'),
  verifyHash: (hash: string) =>
    get<{ valid: boolean; txHash?: string }>(
      `/blockchain/verify/${encodeURIComponent(hash)}`
    ),
  transactions: () => get<{ transactions: any[] }>('/blockchain/transactions'),
  token: (id: string) => get<{ token: any }>(`/blockchain/token/${id}`),
};

// --- Documents -----------------------------------------------------------
export const documentsApi = {
  upload: (formData: FormData) => postForm<{ documentId: string; url: string }>(
    '/documents/upload',
    formData
  ),
  list: () => get<{ documents: any[] }>('/documents/me'),
  getById: (id: string) => get<{ document: any }>(`/documents/${id}`),
  checkFraud: (documentId: string) =>
    post<{ fraudScore: number; status: string; flags?: string[] }>(
      `/documents/${documentId}/check-fraud`
    ),
};

// --- Fraud Logs ---------------------------------------------------------
export const fraudApi = {
  list: (params?: { resolved?: boolean; limit?: number; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.resolved !== undefined) query.append('resolved', String(params.resolved));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.page) query.append('page', String(params.page));
    const qs = query.toString();
    return get<{ reports: any[]; total: number }>(`/fraud-logs${qs ? '?' + qs : ''}`);
  },
  getById: (id: string) => get<{ report: any }>(`/fraud-logs/${id}`),
  resolve: (id: string) => patch<{ success: boolean }>(`/fraud-logs/${id}/resolve`),
};

// --- Audit Logs ---------------------------------------------------------
export const auditApi = {
  list: (params?: { limit?: number; page?: number; action?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.page) query.append('page', String(params.page));
    if (params?.action) query.append('action', params.action);
    const qs = query.toString();
    return get<{ logs: any[]; total: number }>(`/audit-logs${qs ? '?' + qs : ''}`);
  },
};

// ----------------------------------------------------------------------
// 6. Export raw request function for custom calls (optional)
// ----------------------------------------------------------------------
export default {
  get,
  post,
  put,
  patch,
  delete: del,
  postForm,
  request,
};