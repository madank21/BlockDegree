//
// FRONTEND/src/api/api.ts
//
// Single source of truth for all backend calls.
//
// FIXES APPLIED:
//   [1] fraudApi base path: /fraud-logs → /fraud  (backend mounts at /api/v1/fraud)
//   [2] fraudApi.list() uses /fraud/reports        (backend route: GET /reports)
//   [3] fraudApi.resolve() uses /fraud/reports/:id/resolve
//   [4] fraudApi.stats() uses /fraud/stats
//   [5] fraudApi.checks() uses /fraud/checks
//   [6] documentsApi.checkFraud removed            (endpoint does not exist in backend)
//   [7] blockchainApi.totalDegrees → returns { totalDegrees } not { total }
//   [8] blockchainApi.transactions() now accepts params (page, limit, status)
//   [9] degreesApi.publicLookup → /degrees/public/degree/:id  (correct route)
//  [10] degreesApi.getQr → returns { qrCode } not { qrUrl }
//  [11] adminApi group added  (was entirely missing)
//  [12] authApi.logout, authApi.me, authApi.changePassword, authApi.forgotPassword,
//       authApi.resetPassword added
//  [13] usersApi.approve() added
//  [14] documentsApi.update(), documentsApi.delete(), documentsApi.listAll() added
//  [15] verificationApi.getAll(), verificationApi.getStats() added
//  [16] faceApi group added  (was entirely missing)
//

// ─────────────────────────────────────────────────────────────────────────────
// 1. Environment & token
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

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

// ─────────────────────────────────────────────────────────────────────────────
// 2. Custom error class
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// 3. Core request helpers
// ─────────────────────────────────────────────────────────────────────────────

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
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

  // Unwrap { success: true, data: ... } envelope
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

// ─────────────────────────────────────────────────────────────────────────────
// 4. Convenience methods
// ─────────────────────────────────────────────────────────────────────────────

const get  = <T = any>(path: string) => request<T>(path, { method: 'GET' });

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

// ─────────────────────────────────────────────────────────────────────────────
// 5. API endpoint groups
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      email,
      password,
    }),

  register: (payload: Record<string, unknown>) =>
    post<{ accessToken?: string; refreshToken?: string; user: any }>('/auth/register', payload),

  refresh: () => post<{ accessToken: string }>('/auth/refresh-token'),

  // [FIX 12] These were missing
  me:     () => get<{ user: any }>('/auth/me'),
  logout: () => post<void>('/auth/logout'),

  changePassword: (oldPassword: string, newPassword: string) =>
    patch<void>('/auth/change-password', { oldPassword, newPassword }),

  forgotPassword: (email: string) => post<void>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    post<void>('/auth/reset-password', { token, password }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: {
    role?: string;
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params?.role)                   query.append('role',     params.role);
    if (params?.page)                   query.append('page',     String(params.page));
    if (params?.limit)                  query.append('limit',    String(params.limit));
    if (params?.search)                 query.append('search',   params.search);
    if (params?.isActive !== undefined) query.append('isActive', String(params.isActive));
    const qs = query.toString();
    return get<{ users: any[]; total: number }>(`/users${qs ? '?' + qs : ''}`);
  },

  getById: (id: string) => get<{ user: any }>(`/users/${id}`),

  update: (id: string, payload: Record<string, unknown>) =>
    patch<{ user: any }>(`/users/${id}`, payload),

  delete: (id: string) => del<{ success: boolean }>(`/users/${id}`),

  // [FIX 13] Was missing — admin approves a user account
  approve: (id: string) => post<{ user: any }>(`/users/${id}/approve`),
};

// ── Degrees ───────────────────────────────────────────────────────────────────
export const degreesApi = {
  issue: (payload: Record<string, unknown>) =>
    post<{ degreeHash: string; qrCodeUrl: string; degreeId: string }>('/degrees', payload),

  list: (params?: { status?: string; page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page)   query.append('page',   String(params.page));
    if (params?.limit)  query.append('limit',  String(params.limit));
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return get<{ degrees: any[]; total: number }>(`/degrees${qs ? '?' + qs : ''}`);
  },

  getById: (id: string) => get<{ degree: any }>(`/degrees/${id}`),

  // [FIX 10] Backend returns { qrCode, verificationUrl, certificateNumber }, NOT { qrUrl }
  getQr: (id: string) =>
    get<{ qrCode: string; verificationUrl?: string; certificateNumber?: string }>(
      `/degrees/${id}/qr`
    ),

  revoke: (id: string, reason: string) =>
    del<{ success: boolean }>(`/degrees/${id}/revoke`, { reason }),

  // [FIX 9] Correct route: /degrees/public/degree/:id  (backend: router.get('/public/degree/:id', ...))
  publicLookup: (id: string) =>
    get<{ degree: any }>(`/degrees/public/degree/${encodeURIComponent(id)}`),

  publicByCert: (certNumber: string) =>
    get<{ degree: any }>(`/degrees/public/cert/${encodeURIComponent(certNumber)}`),

  update: (id: string, payload: Record<string, unknown>) =>
    patch<{ success: boolean }>(`/degrees/${id}`, payload),

  stats: () => get<any>('/degrees/stats'),
};

// ── Verification ──────────────────────────────────────────────────────────────
export const verificationApi = {
  request: (payload: Record<string, unknown>) =>
    post<{ verificationId: string; status: string; verification_code?: string }>(
      '/verification',
      payload
    ),

  verifyPublic: (hash: string) =>
    get<{
      valid: boolean;
      degreeDetails?: any;
      blockchain: { confirmed: boolean; txHash?: string };
    }>(`/verification/public/${encodeURIComponent(hash)}`),

  getById: (id: string) => get<any>(`/verification/${id}`),

  getByCode: (code: string) => get<any>(`/verification/code/${encodeURIComponent(code)}`),

  // [FIX 15] Were missing
  getAll: (params?: { page?: number; limit?: number; result?: string }) => {
    const query = new URLSearchParams();
    if (params?.page)   query.append('page',   String(params.page));
    if (params?.limit)  query.append('limit',  String(params.limit));
    if (params?.result) query.append('result', params.result);
    const qs = query.toString();
    return get<{ verifications: any[]; total: number }>(`/verification${qs ? '?' + qs : ''}`);
  },

  getStats: () => get<any>('/verification/stats'),
};

// ── Blockchain ────────────────────────────────────────────────────────────────
export const blockchainApi = {
  network: () =>
    get<{ networkName: string; chainId: string; blockNumber: number; walletBalance: string }>(
      '/blockchain/network'
    ),

  // [FIX 7] Backend returns { totalDegrees: N } — not { total: N }
  totalDegrees: () => get<{ totalDegrees: number }>('/blockchain/total'),

  verifyHash: (hash: string) =>
    get<{ valid: boolean; txHash?: string }>(
      `/blockchain/verify/${encodeURIComponent(hash)}`
    ),

  // [FIX 8] Now accepts pagination/filter params
  transactions: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page)   query.append('page',   String(params.page));
    if (params?.limit)  query.append('limit',  String(params.limit));
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return get<{ transactions: any[]; total: number }>(
      `/blockchain/transactions${qs ? '?' + qs : ''}`
    );
  },

  token: (id: string) => get<any>(`/blockchain/token/${id}`),

  getTransaction: (txHash: string) => get<any>(`/blockchain/transaction/${txHash}`),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  upload: (formData: FormData) =>
    postForm<{ documentId: string; url: string }>('/documents/upload', formData),

  list: () => get<{ documents: any[] }>('/documents/me'),

  // [FIX 14] Was missing
  listAll: () => get<{ documents: any[]; total: number }>('/documents/all'),

  getById: (id: string) => get<{ document: any }>(`/documents/${id}`),

  // [FIX 6] checkFraud REMOVED — POST /documents/:id/check-fraud does not exist in backend.
  //         Use documentsApi.verify() instead for document authenticity checks.

  verify: (id: string) =>
    post<{ validation_status: string; validation_errors: string[]; document: any }>(
      `/documents/${id}/verify`
    ),

  // [FIX 14] Were missing — used by DocumentUpload.tsx via api.put / api.delete
  update: (id: string, payload: Record<string, unknown>) =>
    put<any>(`/documents/${id}`, payload),

  delete: (id: string) => del<{ success: boolean }>(`/documents/${id}`),

  getByDegree: (degreeId: string) =>
    get<{ documents: any[] }>(`/documents/degree/${degreeId}`),
};

// ── Fraud ─────────────────────────────────────────────────────────────────────
// [FIX 1-5] Complete rewrite — was calling /fraud-logs (wrong).
// Backend mounts fraudRoutes at /api/v1/fraud.
// Route map:  GET  /reports          → fraudController.getReports
//             GET  /stats            → fraudController.getStats
//             GET  /checks           → fraudController.getFraudChecks
//             POST /check/:appId     → fraudController.runFraudCheck
//             PATCH /reports/:id/resolve → fraudController.resolveReport
export const fraudApi = {
  // Returns array directly (backend: res.json(reports) — no envelope)
  list: (params?: {
    resolved?: boolean;
    severity?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.resolved !== undefined) query.append('resolved',  String(params.resolved));
    if (params?.severity)               query.append('severity',  params.severity);
    if (params?.page)                   query.append('page',      String(params.page));
    if (params?.limit)                  query.append('limit',     String(params.limit));
    const qs = query.toString();
    // Backend returns raw array, not an envelope — keep generic type any[]
    return get<any[]>(`/fraud/reports${qs ? '?' + qs : ''}`);
  },

  // Returns { unresolvedCount, resolvedCount, highCount, mediumCount, lowCount,
  //           duplicateCnicCount, fraudulentDocCount, safetyScore, totalApplications }
  stats: () => get<any>('/fraud/stats'),

  // Returns raw array of checks
  checks: () => get<any[]>('/fraud/checks'),

  // Run fraud check on a specific degree application
  check: (applicationId: string) => post<any>(`/fraud/check/${applicationId}`),

  // Resolve a specific fraud report
  resolve: (reportId: string) =>
    patch<{ success: boolean }>(`/fraud/reports/${reportId}/resolve`),
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
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

// ── Admin ─────────────────────────────────────────────────────────────────────
// [FIX 11] Entire group was missing from the original file
// Backend routes: GET /stats, GET /integrity, POST /backup, GET /backup/last,
//                 POST /restore, GET /export, POST /import, DELETE /cleanup, DELETE /reset
export const adminApi = {
  // Returns { total, used, documents, users, degrees }
  stats: () => get<any>('/admin/stats'),

  // Returns { valid: boolean, errors: string[] }
  integrity: () => get<{ valid: boolean; errors: string[] }>('/admin/integrity'),

  createBackup: () => post<{ backupId: string; message: string }>('/admin/backup'),

  lastBackup: () => get<any>('/admin/backup/last'),

  restoreBackup: (backupId?: string) =>
    post<any>('/admin/restore', backupId ? { backupId } : {}),

  export: () => get<any>('/admin/export'),

  cleanup: (days?: number) =>
    del<{ deletedCount: number }>(`/admin/cleanup${days ? '?days=' + days : ''}`),

  reset: () => del<{ message: string }>('/admin/reset'),
};

// ── Face ──────────────────────────────────────────────────────────────────────
// [FIX 16] Was entirely missing
export const faceApi = {
  enroll: (formData: FormData) => postForm<any>('/face/enroll', formData),
  verify: (formData: FormData) => postForm<any>('/face/verify', formData),
  status: ()                   => get<any>('/face/status'),
  delete: ()                   => del<any>('/face/delete'),
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Export raw request functions for custom one-off calls
// ─────────────────────────────────────────────────────────────────────────────
export default {
  get,
  post,
  put,
  patch,
  delete: del,
  postForm,
  request,
};