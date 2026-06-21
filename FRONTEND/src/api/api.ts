// FRONTEND/src/api/api.ts
//
// Single source of truth for all backend calls. No page or lib file should
// call Supabase directly for mutations, and nothing in the browser should
// call the blockchain directly — everything routes through here, which
// talks to BACKEND/app.js (/api/v1/...).
//
// Usage:
//   import { authApi, degreesApi, verificationApi, blockchainApi, documentsApi } from '@/api/api';
//   const result = await degreesApi.issue({ ... });
//   const data = await verificationApi.verifyPublic(hash);
//   const uploadRes = await documentsApi.upload(formData);

// ----------------------------------------------------------------------
// 1. Environment & token
// ----------------------------------------------------------------------

const BASE_URL = 'http://localhost:5001/api/v1'; // Adjust if your backend runs on a different port or path

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

  // ---- FIX: Unwrap the data envelope if present ----
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

  // ---- FIX: Unwrap the data envelope if present ----
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

// ---- FIX: DELETE now accepts an optional body payload (used for revoke with reason) ----
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
  // ---- FIX: corrected refresh endpoint ----
  refresh: () => post<{ accessToken: string }>('/auth/refresh-token'),
};

// --- Degrees -------------------------------------------------------------
export const degreesApi = {
  // Issue a new degree (admin/university only)
  issue: (payload: Record<string, unknown>) =>
    post<{ degreeHash: string; qrCodeUrl: string; degreeId: string }>(
      '/degrees',
      payload
    ),
  // List degrees (filtered by role)
  list: () => get<{ degrees: any[] }>('/degrees'),
  getById: (id: string) => get<{ degree: any }>(`/degrees/${id}`),
  getQr: (id: string) => get<{ qrUrl: string }>(`/degrees/${id}/qr`),
  // ---- FIX: revoke now accepts a reason and sends it in the body ----
  revoke: (id: string, reason: string) =>
    del<{ success: boolean }>(`/degrees/${id}/revoke`, { reason }),
  publicLookup: (id: string) => get<{ degree: any }>(`/degrees/public/${id}`),
  // ---- FIX: update now uses PATCH (not PUT) ----
  update: (id: string, payload: Record<string, unknown>) =>
    patch<{ success: boolean }>(`/degrees/${id}`, payload),
};

// --- Verification -------------------------------------------------------
export const verificationApi = {
  // Request a new verification (authenticated)
  request: (payload: Record<string, unknown>) =>
    post<{ verificationId: string; status: string }>('/verification', payload),
  // Public hash verification – replaces direct blockchain call
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
  // Upload a file (multipart/form-data) – uses the backend upload endpoint
  upload: (formData: FormData) => postForm<{ documentId: string; url: string }>(
    '/documents/upload',
    formData
  ),
  // ---- FIX: list now calls the existing /documents/me endpoint ----
  list: () => get<{ documents: any[] }>('/documents/me'),
  getById: (id: string) => get<{ document: any }>(`/documents/${id}`),
  // Fraud check (if you have a separate endpoint)
  checkFraud: (documentId: string) =>
    post<{ fraudScore: number; status: string; flags?: string[] }>(
      `/documents/${documentId}/check-fraud`
    ),
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