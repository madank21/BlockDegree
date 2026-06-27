/**
 * Central API Client
 * Path: FRONTEND/src/api/api.ts
 *
 * Single source of truth for ALL backend calls.
 *
 * FIXES vs original:
 *  1. fraudApi base path was /fraud-logs → fixed to /fraud
 *  2. degreesApi.publicLookup URL was /degrees/public/:id → fixed to /degrees/public/degree/:id
 *  3. degreesApi.getQr response field was qrUrl → fixed to qrCode (matches backend)
 *  4. Added degreesApi.issue_existing(id) → POST /degrees/:id/issue
 *  5. Added usersApi.approve(id) → PATCH /users/:id/approve
 *  6. Added usersApi.reject(id)  → PATCH /users/:id/reject
 *  7. Added complete adminApi namespace for DataManagement.tsx
 *  8. listRequest() helper returns { data, total, pagination } for paginated endpoints
 *  9. blockchainApi.totalDegrees() typed correctly as { totalDegrees: number }
 * 10. Added documentsApi.update(id, payload) → PUT /documents/:id
 * 11. Added documentsApi.delete(id)           → DELETE /documents/:id
 * 12. Added verificationApi.verifyPublicByTx(txHash) → GET /verification/public/tx/:txHash
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Base URL & token helpers
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
const TOKEN_KEY = 'token';

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
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

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * JSON request — auto-unwraps { success: true, data: ... } envelope.
 */
async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers || {}),
  };

  const res  = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  let body: unknown = null;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) body = await res.json();
  else if (ct?.includes('text/'))       body = await res.text();

  if (!res.ok) {
    const msg = (body as any)?.message || (body as any)?.error || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }

  // Unwrap { success: true, data: ... }
  if (body && typeof body === 'object' && (body as any).success === true && 'data' in body) {
    return (body as any).data as T;
  }
  return body as T;
}

/**
 * Raw request — returns the full response body WITHOUT unwrapping.
 * Used for paginated endpoints so callers get { data, pagination, total }.
 */
async function rawRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers || {}),
  };

  const res  = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  let body: unknown = null;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) body = await res.json();
  else if (ct?.includes('text/'))       body = await res.text();

  if (!res.ok) {
    const msg = (body as any)?.message || (body as any)?.error || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }
  return body as T;
}

/**
 * Paginated GET — always returns { data: T[], total, pagination }.
 * Works whether the backend wraps in { success, data, pagination } or not.
 */
async function listRequest<T = any>(
  path: string
): Promise<{ data: T[]; total: number; pagination: Record<string, any> }> {
  const raw = await rawRequest<any>(path);

  // Standard envelope: { success, data: [], pagination: {...} }
  if (raw?.success === true && Array.isArray(raw?.data)) {
    return {
      data:       raw.data,
      total:      raw.pagination?.total ?? raw.data.length,
      pagination: raw.pagination ?? {},
    };
  }
  // Bare array
  if (Array.isArray(raw)) {
    return { data: raw, total: raw.length, pagination: {} };
  }
  // Legacy shape: { data: [], total }
  if (raw?.data && Array.isArray(raw.data)) {
    return { data: raw.data, total: raw.total ?? raw.data.length, pagination: {} };
  }
  return { data: [], total: 0, pagination: {} };
}

/**
 * Multipart upload (no Content-Type – browser adds boundary).
 */
async function postForm<T = any>(path: string, formData: FormData): Promise<T> {
  const res  = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });

  let body: unknown = null;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) body = await res.json();
  else body = await res.text();

  if (!res.ok) {
    const msg = (body as any)?.message || (body as any)?.error || `Upload failed (${res.status})`;
    throw new ApiError(msg, res.status, body);
  }
  if (body && typeof body === 'object' && (body as any).success === true && 'data' in body) {
    return (body as any).data as T;
  }
  return body as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Convenience shorthands
// ─────────────────────────────────────────────────────────────────────────────

const get    = <T = any>(path: string) => request<T>(path, { method: 'GET' });
const post   = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined });
const put    = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'PUT',  body: data !== undefined ? JSON.stringify(data) : undefined });
const patch  = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined });
const del    = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'DELETE', body: data !== undefined ? JSON.stringify(data) : undefined });

// ─────────────────────────────────────────────────────────────────────────────
// 5. Query string builder
// ─────────────────────────────────────────────────────────────────────────────

function buildQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. API endpoint groups
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email: string, password: string) =>
    post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { email, password }),
  register: (payload: Record<string, unknown>) =>
    post<{ accessToken?: string; refreshToken?: string; user: any }>('/auth/register', payload),
  me:       () => get<any>('/auth/me'),
  update:   (payload: Record<string, unknown>) => patch<any>('/auth/me', payload),
  logout:   () => post<void>('/auth/logout'),
  refresh:  () => post<{ accessToken: string }>('/auth/refresh-token'),
  forgotPassword: (email: string) => post<void>('/auth/forgot-password', { email }),
  resetPassword:  (token: string, password: string) => post<void>('/auth/reset-password', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    patch<void>('/auth/change-password', { currentPassword, newPassword }),
};

// ── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  /**
   * Returns { data: User[], total, pagination }
   * Usage: const { data: users } = await usersApi.list({ role: 'student' });
   */
  list: (params?: { role?: string; page?: number; limit?: number; search?: string; isActive?: boolean }) =>
    listRequest<any>(`/users${buildQuery(params)}`),

  getById:  (id: string) => get<any>(`/users/${id}`),

  update:   (id: string, payload: Record<string, unknown>) =>
    patch<any>(`/users/${id}`, payload),

  /** FIXED: was missing — StudentsManagement.tsx calls this */
  approve:  (id: string) => patch<any>(`/users/${id}/approve`),

  /** FIXED: was missing */
  reject:   (id: string) => patch<any>(`/users/${id}/reject`),

  delete:   (id: string) => del<any>(`/users/${id}`),
};

// ── Degrees ──────────────────────────────────────────────────────────────────
export const degreesApi = {
  /**
   * Returns { data: Degree[], total, pagination }
   * Usage: const { data: degrees } = await degreesApi.list();
   */
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    listRequest<any>(`/degrees${buildQuery(params)}`),

  getById: (id: string) => get<any>(`/degrees/${id}`),

  /** Create a new degree application */
  create: (payload: Record<string, unknown>) =>
    post<{ degreeHash: string; qrCodeUrl: string; degreeId: string }>('/degrees', payload),

  /** Alias kept for backward compatibility */
  issue: (payload: Record<string, unknown>) =>
    post<{ degreeHash: string; qrCodeUrl: string; degreeId: string }>('/degrees', payload),

  /**
   * FIXED: was missing — DegreeManagement.tsx calls this to issue an approved degree
   */
  issue_existing: (id: string) => post<any>(`/degrees/${id}/issue`),

  update: (id: string, payload: Record<string, unknown>) =>
    patch<any>(`/degrees/${id}`, payload),

  revoke: (id: string, reason: string) =>
    del<any>(`/degrees/${id}/revoke`, { reason }),

  /**
   * FIXED: URL was /degrees/public/:id → backend route is /degrees/public/degree/:id
   */
  publicLookup: (id: string) =>
    get<any>(`/degrees/public/degree/${encodeURIComponent(id)}`),

  publicByCert: (certNumber: string) =>
    get<any>(`/degrees/public/cert/${encodeURIComponent(certNumber)}`),

  /**
   * FIXED: backend returns { qrCode, verificationUrl, certificateNumber }
   *        (not { qrUrl } as old code assumed)
   */
  getQr: (id: string) => get<{ qrCode: string; verificationUrl: string; certificateNumber: string }>(`/degrees/${id}/qr`),

  stats: () => get<any>('/degrees/stats'),
};

// ── Verification ─────────────────────────────────────────────────────────────
export const verificationApi = {
  request: (payload: Record<string, unknown>) =>
    post<{ verification_id: string; verification_code: string; status: string }>('/verification', payload),

  verifyPublic: (hash: string) =>
    get<{ valid: boolean; degreeDetails?: any; blockchain: any }>(`/verification/public/${encodeURIComponent(hash)}`),

  /** NEW: Verify degree by transaction hash */
  verifyPublicByTx: (txHash: string) =>
    get<{ valid: boolean; degreeDetails?: any; blockchain: any }>(`/verification/public/tx/${encodeURIComponent(txHash)}`),

  getById:   (id: string)   => get<any>(`/verification/${id}`),
  getByCode: (code: string) => get<any>(`/verification/code/${encodeURIComponent(code)}`),

  list: (params?: { status?: string; page?: number; limit?: number }) =>
    listRequest<any>(`/verification${buildQuery(params)}`),

  stats: () => get<any>('/verification/stats'),

  retrigger: (id: string) => post<any>(`/verification/${id}/retrigger`),
};

// ── Blockchain ────────────────────────────────────────────────────────────────
export const blockchainApi = {
  network: () => get<{ networkName: string; chainId: string; blockNumber: number; walletBalance: string; contractAddress: string }>('/blockchain/network'),

  /** FIXED: backend returns { total: N } */
  totalDegrees: () => get<{ total: number }>('/blockchain/total'),

  verifyHash: (hash: string) => get<{ exists: boolean; isValid: boolean; isRevoked: boolean }>(`/blockchain/verify/${encodeURIComponent(hash)}`),

  getTransaction: (txHash: string) => get<any>(`/blockchain/transaction/${encodeURIComponent(txHash)}`),

  token: (tokenId: string) => get<any>(`/blockchain/token/${encodeURIComponent(tokenId)}`),

  transactions: (params?: { page?: number; limit?: number; status?: string }) =>
    listRequest<any>(`/blockchain/transactions${buildQuery(params)}`),

  register: (degreeId: string) => post<any>(`/blockchain/degrees/${degreeId}/register`),
};

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  upload: (formData: FormData) =>
    postForm<any>('/documents/upload', formData),

  list: () => listRequest<any>('/documents/me'),

  getById: (id: string) => get<any>(`/documents/${id}`),

  verify: (id: string) => post<any>(`/documents/${id}/verify`),

  /** FIXED: was missing — DocumentUpload.tsx calls api.put('/documents/:id', ...) */
  update: (id: string, payload: Record<string, unknown>) =>
    put<any>(`/documents/${id}`, payload),

  /** FIXED: was missing explicit method */
  delete: (id: string) => del<any>(`/documents/${id}`),

  reanalyze: (id: string) => post<any>(`/documents/${id}/reanalyze`),

  listAll: (params?: { page?: number; limit?: number }) =>
    listRequest<any>(`/documents/all${buildQuery(params)}`),
};

// ── Fraud ─────────────────────────────────────────────────────────────────────
/**
 * FIXED: base path was /fraud-logs → correct path is /fraud
 */
export const fraudApi = {
  reports: (params?: { resolved?: boolean; severity?: string; page?: number; limit?: number }) =>
    get<{ reports: any[]; total: number }>(`/fraud/reports${buildQuery(params)}`),

  list: (params?: { resolved?: boolean; severity?: string; page?: number; limit?: number }) =>
    get<any>(`/fraud/reports${buildQuery(params)}`),

  stats: () => get<any>('/fraud/stats'),

  checks: () => get<any[]>('/fraud/checks'),

  runCheck: (applicationId: string) => post<any>(`/fraud/check/${applicationId}`),

  resolve: (reportId: string) => patch<any>(`/fraud/reports/${reportId}/resolve`),
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params?: { limit?: number; page?: number; action?: string; userId?: string }) =>
    listRequest<any>(`/audit-logs${buildQuery(params)}`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
/**
 * FIXED: adminApi was completely missing — DataManagement.tsx requires all of these
 */
export const adminApi = {
  stats: () => get<{
    total: number; used: number; documents: number;
    users: number; degrees: number; fraudAlerts: number;
  }>('/admin/stats'),

  integrity: () => get<{ valid: boolean; errors: string[] }>('/admin/integrity'),

  createBackup: () => post<{ backupId: string; timestamp: string }>('/admin/backup'),
  backup: () => post<{ backupId: string; timestamp: string }>('/admin/backup'),

  lastBackup: () => get<{ lastBackup: string | null; backupId?: string; count?: number }>('/admin/backup/last'),

  restoreBackup: (backupId?: string) => post<any>('/admin/restore', backupId ? { backupId } : {}),
  restore: (backupId?: string) => post<any>('/admin/restore', backupId ? { backupId } : {}),

  /** Returns raw Response for blob download */
  export: async (): Promise<Blob> => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/admin/export`, {
      method: 'GET',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(body?.message || 'Export failed', res.status, body);
    }
    return res.blob();
  },

  import: (formData: FormData) => postForm<any>('/admin/import', formData),

  cleanup: (days: number = 90) => del<{ deletedCount: number; filesRemoved: number }>(`/admin/cleanup?days=${days}`),

  reset: () => del<any>('/admin/reset'),
};

// ── Applications (Degree Applications) ──────────────────────────────────────────
export const applicationsApi = {
  create: (payload: Record<string, unknown>) =>
    post<{ applicationId: string; status: string }>('/applications', payload),
  list: (params?: { status?: string; page?: number }) =>
    listRequest<any>(`/applications${buildQuery(params)}`),
  updateStatus: (id: string, status: string, notes?: string) =>
    patch<any>(`/applications/${id}/status`, { status, notes }),
  // ... other methods
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Default export (raw request object for ad-hoc use)
// ─────────────────────────────────────────────────────────────────────────────

export default {
  get,
  post,
  put,
  patch,
  delete: del,
  postForm,
  request,
  rawRequest,
  listRequest,
};