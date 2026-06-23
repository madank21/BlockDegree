// FRONTEND/src/api/api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all backend calls.
// FIXES:
//   - fraudApi base path changed /fraud-logs → /fraud (was calling wrong URL)
//   - degreesApi.publicLookup uses /degrees/public/degree/:id (not /degrees/public/:id)
//   - degreesApi.getQr returns qrCode (not qrUrl) — now mapped correctly
//   - documentsApi.update() and documentsApi.delete() added (were missing)
//   - documentsApi.checkFraud removed (endpoint doesn't exist in backend)
//   - authApi logout + profile update + changePassword added
//   - adminApi group added for DataManagement page
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Environment & token ────────────────────────────────────────────────────

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

// ── 2. Custom error class ─────────────────────────────────────────────────────

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

// ── 3. Core request helpers ────────────────────────────────────────────────────

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

// ── 4. Convenience methods ─────────────────────────────────────────────────────

const get  = <T = any>(path: string) => request<T>(path, { method: 'GET' });
const post = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined });
const put  = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined });
const patch = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined });
const del  = <T = any>(path: string, data?: unknown) =>
  request<T>(path, { method: 'DELETE', body: data !== undefined ? JSON.stringify(data) : undefined });

// ── 5. API endpoint groups ─────────────────────────────────────────────────────

// --- Auth ----------------------------------------------------------------
export const authApi = {
  login: (email: string, password: string) =>
    post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      email,
      password,
    }),
  register: (payload: Record<string, unknown>) =>
    post<{ accessToken?: string; refreshToken?: string; user: any }>('/auth/register', payload),
  refresh: () => post<{ accessToken: string }>('/auth/refresh-token'),
  me: () => get<{ user: any }>('/auth/me'),
  updateMe: (payload: Record<string, unknown>) => patch<{ user: any }>('/auth/me', payload),
  logout: () => post<void>('/auth/logout'),
  changePassword: (oldPassword: string, newPassword: string) =>
    patch<void>('/auth/change-password', { oldPassword, newPassword }),
  forgotPassword: (email: string) => post<void>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    post<void>('/auth/reset-password', { token, password }),
};

// --- Users ---------------------------------------------------------------
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
  getById:  (id: string) => get<{ user: any }>(`/users/${id}`),
  update:   (id: string, payload: Record<string, unknown>) =>
    patch<{ user: any }>(`/users/${id}`, payload),
  delete:   (id: string) => del<{ success: boolean }>(`/users/${id}`),
  approve:  (id: string) => post<{ user: any }>(`/users/${id}/approve`),
};

// --- Degrees -------------------------------------------------------------
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
    return get<any>(`/degrees${qs ? '?' + qs : ''}`);
  },

  getById: (id: string) => get<any>(`/degrees/${id}`),

  // FIX: Backend returns { qrCode, verificationUrl, certificateNumber }
  // Normalised here so consumers always get { qrCode }
  getQr: (id: string) =>
    get<{ qrCode: string; verificationUrl?: string; certificateNumber?: string }>(
      `/degrees/${id}/qr`
    ),

  revoke: (id: string, reason: string) =>
    del<{ success: boolean }>(`/degrees/${id}/revoke`, { reason }),

  // FIX: Correct URL — backend route is /degrees/public/degree/:id (not /degrees/public/:id)
  publicLookup: (id: string) =>
    get<{ degree: any }>(`/degrees/public/degree/${encodeURIComponent(id)}`),

  publicByCert: (certNumber: string) =>
    get<any>(`/degrees/public/cert/${encodeURIComponent(certNumber)}`),

  update: (id: string, payload: Record<string, unknown>) =>
    patch<any>(`/degrees/${id}`, payload),

  issue_existing: (id: string) =>
    post<any>(`/degrees/${id}/issue`),

  stats: () => get<any>('/degrees/stats'),
};

// --- Verification --------------------------------------------------------
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
  getById:   (id: string)   => get<any>(`/verification/${id}`),
  getByCode: (code: string) => get<any>(`/verification/code/${encodeURIComponent(code)}`),
  getAll:    (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page)  query.append('page',  String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return get<{ verifications: any[]; total: number }>(`/verification${qs ? '?' + qs : ''}`);
  },
  getStats: () => get<any>('/verification/stats'),
};

// --- Blockchain (read-only, server-proxied) ----------------------------
export const blockchainApi = {
  network:       () => get<any>('/blockchain/network'),
  totalDegrees:  () => get<{ totalDegrees: number }>('/blockchain/total'),
  verifyHash:    (hash: string) =>
    get<{ valid: boolean; txHash?: string }>(`/blockchain/verify/${encodeURIComponent(hash)}`),
  transactions:  (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page)   query.append('page',   String(params.page));
    if (params?.limit)  query.append('limit',  String(params.limit));
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return get<any>(`/blockchain/transactions${qs ? '?' + qs : ''}`);
  },
  token:         (id: string) => get<any>(`/blockchain/token/${id}`),
  getTransaction:(tx: string) => get<any>(`/blockchain/transaction/${tx}`),
};

// --- Documents -----------------------------------------------------------
export const documentsApi = {
  upload:  (formData: FormData) =>
    postForm<{ documentId: string; url: string }>('/documents/upload', formData),
  list:    () => get<{ documents: any[] }>('/documents/me'),
  listAll: () => get<{ documents: any[]; total: number }>('/documents/all'),
  getById: (id: string) => get<{ document: any }>(`/documents/${id}`),

  // FIX: checkFraud removed — endpoint /documents/:id/check-fraud does not exist in backend
  // Use verify instead for document authenticity checks

  verify: (id: string) =>
    post<{ validation_status: string; validation_errors: string[]; document: any }>(
      `/documents/${id}/verify`
    ),

  // FIX: update and delete added — they were used in DocumentUpload.tsx but missing here
  update: (id: string, payload: Record<string, unknown>) =>
    put<any>(`/documents/${id}`, payload),

  delete: (id: string) => del<{ success: boolean }>(`/documents/${id}`),

  reanalyze: (id: string) => post<any>(`/documents/${id}/reanalyze`),

  getByDegree: (degreeId: string) =>
    get<{ documents: any[] }>(`/documents/degree/${degreeId}`),
};

// --- Fraud ---------------------------------------------------------------
// FIX: Base path was /fraud-logs (wrong). Backend mounts at /fraud.
export const fraudApi = {
  list: (params?: { resolved?: boolean; riskLevel?: string; limit?: number; page?: number }) => {
    const query = new URLSearchParams();
    if (params?.resolved  !== undefined) query.append('resolved',  String(params.resolved));
    if (params?.riskLevel)               query.append('riskLevel', params.riskLevel);
    if (params?.limit)                   query.append('limit',     String(params.limit));
    if (params?.page)                    query.append('page',      String(params.page));
    const qs = query.toString();
    // FIX: /fraud not /fraud-logs
    return get<{ reports: any[]; total: number }>(`/fraud${qs ? '?' + qs : ''}`);
  },
  stats:   ()         => get<any>('/fraud/stats'),
  checks:  (params?: { page?: number; limit?: number; minScore?: number }) => {
    const query = new URLSearchParams();
    if (params?.page)     query.append('page',     String(params.page));
    if (params?.limit)    query.append('limit',    String(params.limit));
    if (params?.minScore) query.append('minScore', String(params.minScore));
    const qs = query.toString();
    return get<any>(`/fraud/checks${qs ? '?' + qs : ''}`);
  },
  // FIX: resolve path was /fraud-logs/:id/resolve → /fraud/reports/:id/resolve
  resolve: (id: string) => patch<{ success: boolean }>(`/fraud/reports/${id}/resolve`),
  check:   (appId: string) => post<any>(`/fraud/check/${appId}`),
};

// --- Audit Logs ----------------------------------------------------------
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

// --- Admin ---------------------------------------------------------------
export const adminApi = {
  stats:         () => get<any>('/admin/stats'),
  integrity:     () => get<any>('/admin/integrity'),
  createBackup:  () => post<any>('/admin/backup'),
  lastBackup:    () => get<any>('/admin/backup/last'),
  restoreBackup: (backupId?: string) => post<any>('/admin/restore', backupId ? { backupId } : {}),
  export:        () => get<any>('/admin/export'),
  cleanup:       (days?: number) =>
    del<any>(`/admin/cleanup${days ? '?days=' + days : ''}`),
  reset:         () => del<any>('/admin/reset'),
};

// --- Face ----------------------------------------------------------------
export const faceApi = {
  enroll: (formData: FormData) => postForm<any>('/face/enroll', formData),
  verify: (formData: FormData) => postForm<any>('/face/verify', formData),
  status: ()                   => get<any>('/face/status'),
  delete: ()                   => del<any>('/face/delete'),
};

// ── 6. Raw request export ─────────────────────────────────────────────────────
export default {
  get,
  post,
  put,
  patch,
  delete: del,
  postForm,
  request,
};