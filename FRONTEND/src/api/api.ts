//
// Single source of truth for all backend calls. No page or lib file should
// call Supabase directly for mutations, and nothing in the browser should
// call the blockchain directly — everything routes through here, which
// talks to BACKEND/app.js (/api/v1/...).
//
// FIXES applied (Audit Report §3.2, §7):
//   FIX-1: fraudApi base path changed from /fraud-logs → /fraud
//   FIX-2: degreesApi.publicLookup URL fixed: /degrees/public/:id → /degrees/public/degree/:id
//   FIX-3: degreesApi.getQr now returns { qrCode } (matches backend response field)
//   FIX-4: usersApi.getById / update / delete kept — backend routes will be added in File 4 (userRoutes.js)
//   FIX-5: documentsApi.checkFraud now calls POST /documents/:id/fraud-check (new backend route added in app.js)
//   FIX-6: authApi exposes me / updateMe / logout / forgotPassword / resetPassword / changePassword
//   FIX-7: adminApi added for Data Management page calls
//   FIX-8: verificationApi.retrigger added
//   FIX-9: blockchainApi.register added
//
// Usage:
//   import { authApi, degreesApi, verificationApi, blockchainApi, documentsApi,
//            usersApi, auditApi, fraudApi, adminApi } from '@/api/api';

// ----------------------------------------------------------------------
// 1. Environment & token
// ----------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Token storage key — must match what authController returns and store.ts stores
const TOKEN_KEY = 'token';

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
 * Performs a JSON request (GET, POST, PUT, PATCH, DELETE).
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

  let body: unknown = null;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    body = await res.json();
  } else if (contentType?.includes('text/')) {
    body = await res.text();
  } else {
    body = undefined;
  }

  if (!res.ok) {
    const message =
      (body as any)?.message || (body as any)?.error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  // Unwrap the standard { success: true, data: ... } envelope
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
 * Do NOT set Content-Type manually — browser adds the correct boundary.
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
// 4. Convenience methods
// ----------------------------------------------------------------------

const get  = <T = any>(path: string) => request<T>(path, { method: 'GET' });
const post = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined });
const put  = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined });
const patch = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined });
const del  = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'DELETE', body: data !== undefined ? JSON.stringify(data) : undefined });

// ----------------------------------------------------------------------
// 5. API endpoint groups
// ----------------------------------------------------------------------

// --- Auth -----------------------------------------------------------------
export const authApi = {
  login: (email: string, password: string) =>
    post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { email, password }),

  register: (payload: Record<string, unknown>) =>
    post<{ accessToken?: string; refreshToken?: string; user: any }>('/auth/register', payload),

  /** FIX-6: refresh uses the standard /auth/refresh-token endpoint */
  refresh: () =>
    post<{ accessToken: string }>('/auth/refresh-token'),

  me: () => get<{ user: any }>('/auth/me'),
  updateMe: (payload: Record<string, unknown>) => patch<{ user: any }>('/auth/me', payload),
  logout: () => post<void>('/auth/logout'),

  forgotPassword: (email: string) =>
    post<void>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    post<void>('/auth/reset-password', { token, password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    patch<void>('/auth/change-password', { currentPassword, newPassword }),
};

// --- Users ----------------------------------------------------------------
// FIX-4: usersApi retains getById/update/delete — these backend routes are
//        now wired in BACKEND/routes/userRoutes.js (File 3).
export const usersApi = {
  list: (params?: { role?: string; page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.role)     query.append('role',     params.role);
    if (params?.page)     query.append('page',     String(params.page));
    if (params?.limit)    query.append('limit',    String(params.limit));
    if (params?.search)   query.append('search',   params.search);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    const qs = query.toString();
    return get<{ users: any[]; total: number }>(`/users${qs ? '?' + qs : ''}`);
  },

  getById: (id: string) =>
    get<{ user: any }>(`/users/${id}`),

  update: (id: string, payload: Record<string, unknown>) =>
    patch<{ user: any }>(`/users/${id}`, payload),

  delete: (id: string) =>
    del<{ success: boolean }>(`/users/${id}`),

  /** Admin: approve or reject a user account */
  approve: (id: string) =>
    patch<{ user: any }>(`/users/${id}/approve`),

  reject: (id: string, reason?: string) =>
    patch<{ success: boolean }>(`/users/${id}/reject`, { reason }),
};

// --- Degrees --------------------------------------------------------------
export const degreesApi = {
  issue: (payload: Record<string, unknown>) =>
    post<{ degreeHash: string; qrCodeUrl: string; degreeId: string }>('/degrees', payload),

  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page)   query.append('page',   String(params.page));
    if (params?.limit)  query.append('limit',  String(params.limit));
    const qs = query.toString();
    return get<{ degrees: any[]; total: number }>(`/degrees${qs ? '?' + qs : ''}`);
  },

  getById: (id: string) => get<{ degree: any }>(`/degrees/${id}`),

  // FIX-3: backend returns { qrCode, verificationUrl, certificateNumber }
  //        field renamed from qrUrl → qrCode to match backend
  getQr: (id: string) =>
    get<{ qrCode: string; verificationUrl: string; certificateNumber: string }>(`/degrees/${id}/qr`),

  revoke: (id: string, reason: string) =>
    del<{ success: boolean }>(`/degrees/${id}/revoke`, { reason }),

  // FIX-2: correct path is /degrees/public/degree/:id (not /degrees/public/:id)
  publicLookup: (id: string) =>
    get<{ degree: any }>(`/degrees/public/degree/${encodeURIComponent(id)}`),

  publicByCert: (certNumber: string) =>
    get<{ degree: any }>(`/degrees/public/cert/${encodeURIComponent(certNumber)}`),

  update: (id: string, payload: Record<string, unknown>) =>
    patch<{ success: boolean }>(`/degrees/${id}`, payload),

  stats: () => get<any>('/degrees/stats'),
};

// --- Verification ---------------------------------------------------------
export const verificationApi = {
  request: (payload: Record<string, unknown>) =>
    post<{ verificationId: string; verificationCode: string; status: string }>('/verification', payload),

  verifyPublic: (hash: string) =>
    get<{
      valid: boolean;
      degreeDetails?: any;
      blockchain: { txHash?: string; verified?: boolean; blockNumber?: number };
    }>(`/verification/public/${encodeURIComponent(hash)}`),

  getById: (id: string) =>
    get<{ verification: any }>(`/verification/${id}`),

  getByCode: (code: string) =>
    get<{ verification: any }>(`/verification/code/${encodeURIComponent(code)}`),

  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page)   query.append('page',   String(params.page));
    if (params?.limit)  query.append('limit',  String(params.limit));
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return get<{ verifications: any[]; total: number }>(`/verification${qs ? '?' + qs : ''}`);
  },

  stats: () => get<any>('/verification/stats'),

  // FIX-8: retrigger a verification by ID
  retrigger: (id: string) =>
    post<{ verification: any }>(`/verification/${id}/retrigger`),
};

// --- Blockchain -----------------------------------------------------------
export const blockchainApi = {
  network: () =>
    get<{ chainId: number; gasPrice: string; blockNumber: number }>('/blockchain/network'),

  totalDegrees: () => get<{ total: number }>('/blockchain/total'),

  verifyHash: (hash: string) =>
    get<{ valid: boolean; txHash?: string }>(`/blockchain/verify/${encodeURIComponent(hash)}`),

  transactions: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page)  query.append('page',  String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return get<{ transactions: any[] }>(`/blockchain/transactions${qs ? '?' + qs : ''}`);
  },

  // FIX-9: token lookup — calls GET /blockchain/token/:tokenId
  token: (tokenId: string) =>
    get<{ token: any }>(`/blockchain/token/${tokenId}`),

  transaction: (txHash: string) =>
    get<{ transaction: any }>(`/blockchain/transaction/${encodeURIComponent(txHash)}`),

  // Register a degree on-chain manually
  register: (degreeId: string) =>
    post<{ txHash: string }>(`/blockchain/degrees/${degreeId}/register`),
};

// --- Documents ------------------------------------------------------------
export const documentsApi = {
  upload: (formData: FormData) =>
    postForm<{ documentId: string; url: string }>('/documents/upload', formData),

  list: () => get<{ documents: any[] }>('/documents/me'),

  listAll: () => get<{ documents: any[] }>('/documents/all'),

  getById: (id: string) => get<{ document: any }>(`/documents/${id}`),

  listByDegree: (degreeId: string) =>
    get<{ documents: any[] }>(`/documents/degree/${degreeId}`),

  // FIX-5: endpoint changed to POST /documents/:id/fraud-check
  //        (backend route added in File 4 app.js)
  checkFraud: (documentId: string) =>
    post<{ fraudScore: number; status: string; flags?: string[] }>(
      `/documents/${documentId}/fraud-check`
    ),

  verify: (id: string) =>
    post<{ validation_status: string; validation_errors: string[]; document: any }>(
      `/documents/${id}/verify`
    ),

  update: (id: string, payload: Record<string, unknown>) =>
    put<{ document: any }>(`/documents/${id}`, payload),

  delete: (id: string) =>
    del<{ success: boolean }>(`/documents/${id}`),

  reanalyze: (id: string) =>
    post<{ document: any }>(`/documents/${id}/reanalyze`),
};

// --- Fraud ----------------------------------------------------------------
// FIX-1: base path corrected from /fraud-logs → /fraud
export const fraudApi = {
  list: (params?: { resolved?: boolean; limit?: number; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.resolved !== undefined) query.append('resolved', String(params.resolved));
    if (params?.limit)  query.append('limit',  String(params.limit));
    if (params?.page)   query.append('page',   String(params.page));
    const qs = query.toString();
    return get<{ reports: any[]; total: number }>(`/fraud/reports${qs ? '?' + qs : ''}`);
  },

  stats: () => get<any>('/fraud/stats'),

  checks: () => get<any>('/fraud/checks'),

  checkOne: (appId: string) =>
    post<{ result: any }>(`/fraud/check/${appId}`),

  getById: (id: string) =>
    get<{ report: any }>(`/fraud/reports/${id}`),

  resolve: (id: string) =>
    patch<{ success: boolean }>(`/fraud/reports/${id}/resolve`),
};

// --- Audit Logs -----------------------------------------------------------
export const auditApi = {
  list: (params?: { limit?: number; page?: number; action?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit)  query.append('limit',  String(params.limit));
    if (params?.page)   query.append('page',   String(params.page));
    if (params?.action) query.append('action', params.action);
    const qs = query.toString();
    return get<{ logs: any[]; total: number }>(`/audit-logs${qs ? '?' + qs : ''}`);
  },
};

// --- Admin ----------------------------------------------------------------
// FIX-7: adminApi for DataManagement.tsx and AdminDashboard.tsx
export const adminApi = {
  stats: () => get<any>('/admin/stats'),

  integrity: () => get<any>('/admin/integrity'),

  lastBackup: () => get<any>('/admin/backup/last'),

  backup: () => post<any>('/admin/backup'),

  restore: (payload?: Record<string, unknown>) =>
    post<any>('/admin/restore', payload ?? {}),

  export: () => get<any>('/admin/export'),

  import: (formData: FormData) =>
    postForm<any>('/admin/import', formData),

  cleanup: () => del<any>('/admin/cleanup'),

  reset: () => del<any>('/admin/reset'),
};

// ----------------------------------------------------------------------
// 6. Raw request export (for custom one-off calls)
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