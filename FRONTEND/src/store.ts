// FRONTEND/src/store.ts — Zustand-backed state + API integration
import { createStore } from 'zustand/vanilla';

import { User, DegreeApplication, BlockchainTransaction, AuditLog, FraudReport, VerificationRequest, UploadedDocument, UserRole } from './types';
import {
  authApi,
  degreesApi,
  verificationApi,
  documentsApi,
  setToken,
  clearToken,
} from '@/api/api';

// Browser-local store (cached copy of backend data)
const STORAGE_KEY = 'blockdegree_store';

interface AppState {
  currentUser: User | null;
  users: User[];
  degreeApplications: DegreeApplication[];
  blockchainTransactions: BlockchainTransaction[];
  auditLogs: AuditLog[];
  fraudReports: FraudReport[];
  verificationRequests: VerificationRequest[];
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// ============================================================
// SAMPLE DATA (used only as fallback when localStorage is empty)
// All password hashes are dummy values – real auth is via backend.
// ============================================================

const sampleStudents: User[] = [
  {
    id: 'student1',
    name: 'Madan Kumar',
    email: 'madan.70618@iqra.edu.pk',
    passwordHash: 'demo-hash', // dummy
    registrationNumber: '70618',
    role: 'student',
    verificationStatus: 'approved',
    fatherName: 'Raj Kumar',
    cnicNumber: '42201-1234567-1',
    department: 'Computer Science',
    program: 'BS Computer Science',
    admissionYear: 2022,
    graduationYear: 2026,
    cgpa: 3.74,
    profilePhoto: '',
    documents: [
      { id: 'doc1', type: 'cnic', fileName: 'cnic_front.jpg', uploadedAt: '2025-01-15', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: { name: 'Madan Kumar', cnic: '42201-1234567-1' } },
      { id: 'doc2', type: 'marksheet', fileName: 'marksheet_2024.pdf', uploadedAt: '2025-01-15', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: { cgpa: '3.74', board: 'Iqra University' } },
      { id: 'doc3', type: 'certificate', fileName: 'intermediate_cert.pdf', uploadedAt: '2025-01-15', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: {} },
    ],
    createdAt: '2025-01-10',
  },
  {
    id: 'student2',
    name: 'Ayesha Khan',
    email: 'ayesha.70425@iqra.edu.pk',
    passwordHash: 'demo-hash',
    registrationNumber: '70425',
    role: 'student',
    verificationStatus: 'documents_uploaded',
    fatherName: 'Ali Khan',
    cnicNumber: '42201-7654321-2',
    department: 'Software Engineering',
    program: 'BS Software Engineering',
    admissionYear: 2022,
    graduationYear: 2026,
    cgpa: 3.52,
    documents: [
      { id: 'doc4', type: 'cnic', fileName: 'cnic_ayesha.jpg', uploadedAt: '2025-02-01', ocrStatus: 'processing', yoloStatus: 'pending', extractedData: {} },
    ],
    createdAt: '2025-01-20',
  },
  {
    id: 'student3',
    name: 'Ahmed Raza',
    email: 'ahmed.70312@iqra.edu.pk',
    passwordHash: 'demo-hash',
    registrationNumber: '70312',
    role: 'student',
    verificationStatus: 'face_verified',
    fatherName: 'Muhammad Raza',
    cnicNumber: '42301-9876543-3',
    department: 'Computer Science',
    program: 'BS Computer Science',
    admissionYear: 2021,
    graduationYear: 2025,
    cgpa: 3.88,
    documents: [
      { id: 'doc5', type: 'cnic', fileName: 'cnic_ahmed.jpg', uploadedAt: '2024-12-10', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: { name: 'Ahmed Raza', cnic: '42301-9876543-3' } },
      { id: 'doc6', type: 'marksheet', fileName: 'marksheet_ahmed.pdf', uploadedAt: '2024-12-10', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: {} },
    ],
    createdAt: '2024-12-05',
  },
  {
    id: 'student4',
    name: 'Fatima Zahra',
    email: 'fatima.70189@iqra.edu.pk',
    passwordHash: 'demo-hash',
    registrationNumber: '70189',
    role: 'student',
    verificationStatus: 'approved',
    fatherName: 'Hassan Zahra',
    cnicNumber: '42201-5432167-4',
    department: 'Artificial Intelligence',
    program: 'BS Artificial Intelligence',
    admissionYear: 2022,
    graduationYear: 2026,
    cgpa: 3.91,
    documents: [
      { id: 'doc7', type: 'cnic', fileName: 'cnic_fatima.jpg', uploadedAt: '2025-01-05', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: {} },
      { id: 'doc8', type: 'marksheet', fileName: 'marksheet_fatima.pdf', uploadedAt: '2025-01-05', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: {} },
      { id: 'doc9', type: 'certificate', fileName: 'cert_fatima.pdf', uploadedAt: '2025-01-05', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: {} },
    ],
    createdAt: '2025-01-01',
  },
];

const sampleAdmin: User = {
  id: 'admin1',
  name: 'Dr. Abdullah Shah',
  email: 'admin@iqra.edu.pk',
  passwordHash: 'demo-hash',
  registrationNumber: 'ADM001',
  role: 'admin',
  verificationStatus: 'approved',
  department: 'Administration',
  createdAt: '2024-01-01',
};

const sampleEmployer: User = {
  id: 'employer1',
  name: 'TechCorp HR',
  email: 'hr@techcorp.com',
  passwordHash: 'demo-hash',
  registrationNumber: 'EMP001',
  role: 'employer',
  verificationStatus: 'approved',
  createdAt: '2025-01-01',
};

const sampleDegreeApplications: DegreeApplication[] = [
  {
    id: 'deg1',
    studentId: 'student1',
    studentName: 'Madan Kumar',
    registrationNumber: '70618',
    department: 'Computer Science',
    program: 'BS Computer Science',
    degreeTitle: 'Bachelor of Science in Computer Science',
    cgpa: 3.74,
    admissionYear: 2022,
    graduationYear: 2026,
    status: 'issued',
    appliedAt: '2026-01-15',
    approvedAt: '2026-01-20',
    blockchainHash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    degreeId: 'IQRA-CS-2026-70618',
    qrCodeData: 'https://blockdegree.iqra.edu.pk/verify/IQRA-CS-2026-70618',
    fraudScore: 92,
  },
  {
    id: 'deg2',
    studentId: 'student4',
    studentName: 'Fatima Zahra',
    registrationNumber: '70189',
    department: 'Artificial Intelligence',
    program: 'BS Artificial Intelligence',
    degreeTitle: 'Bachelor of Science in Artificial Intelligence',
    cgpa: 3.91,
    admissionYear: 2022,
    graduationYear: 2026,
    status: 'approved',
    appliedAt: '2026-02-01',
    approvedAt: '2026-02-05',
    blockchainHash: '',
    degreeId: 'IQRA-AI-2026-70189',
    fraudScore: 96,
  },
  {
    id: 'deg3',
    studentId: 'student3',
    studentName: 'Ahmed Raza',
    registrationNumber: '70312',
    department: 'Computer Science',
    program: 'BS Computer Science',
    degreeTitle: 'Bachelor of Science in Computer Science',
    cgpa: 3.88,
    admissionYear: 2021,
    graduationYear: 2025,
    status: 'pending',
    appliedAt: '2025-12-20',
    fraudScore: 85,
  },
];

const sampleBlockchainTx: BlockchainTransaction[] = [
  {
    id: 'tx1',
    txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
    degreeId: 'IQRA-CS-2026-70618',
    studentRegNo: '70618',
    degreeHash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    timestamp: '2026-01-20T10:30:00Z',
    issuerAddress: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
    blockNumber: 15234,
    gasUsed: 85420,
    status: 'confirmed',
  },
];

const sampleAuditLogs: AuditLog[] = [
  { id: 'log1', action: 'User Registration', userId: 'student1', userName: 'Madan Kumar', timestamp: '2025-01-10T09:00:00Z', details: 'Student registered with email madan.70618@iqra.edu.pk', category: 'auth' },
  { id: 'log2', action: 'Documents Uploaded', userId: 'student1', userName: 'Madan Kumar', timestamp: '2025-01-15T11:00:00Z', details: 'CNIC, Marksheet, and Certificate uploaded', category: 'verification' },
  { id: 'log3', action: 'OCR Verification Complete', userId: 'student1', userName: 'Madan Kumar', timestamp: '2025-01-15T11:05:00Z', details: 'OCR extracted and verified data from uploaded documents', category: 'verification' },
  { id: 'log4', action: 'YOLO Document Validation', userId: 'student1', userName: 'Madan Kumar', timestamp: '2025-01-15T11:06:00Z', details: 'Document authenticity validated using YOLOv8', category: 'verification' },
  { id: 'log5', action: 'Face Verification Passed', userId: 'student1', userName: 'Madan Kumar', timestamp: '2025-01-16T10:00:00Z', details: 'Live selfie matched with CNIC photo (98.7% confidence)', category: 'verification' },
  { id: 'log6', action: 'Student Approved', userId: 'admin1', userName: 'Dr. Abdullah Shah', timestamp: '2025-01-17T09:00:00Z', details: 'Student Madan Kumar (70618) verification approved', category: 'admin' },
  { id: 'log7', action: 'Degree Applied', userId: 'student1', userName: 'Madan Kumar', timestamp: '2026-01-15T14:00:00Z', details: 'Applied for BS Computer Science degree', category: 'degree' },
  { id: 'log8', action: 'Degree Issued', userId: 'admin1', userName: 'Dr. Abdullah Shah', timestamp: '2026-01-20T10:00:00Z', details: 'Degree IQRA-CS-2026-70618 issued to Madan Kumar', category: 'degree' },
  { id: 'log9', action: 'Attestation Created', userId: 'system', userName: 'System', timestamp: '2026-01-20T10:30:00Z', details: 'Degree hash recorded in the local attestation ledger (Block #15234)', category: 'blockchain' },
  { id: 'log10', action: 'Fraud Attempt Detected', userId: 'unknown', userName: 'Unknown', timestamp: '2026-01-25T16:00:00Z', details: 'Duplicate CNIC submission detected from different account', category: 'fraud' },
];

const sampleFraudReports: FraudReport[] = [
  { id: 'fr1', studentId: 'unknown', studentName: 'Unknown User', type: 'Duplicate CNIC', severity: 'high', description: 'Same CNIC number submitted from two different accounts', timestamp: '2026-01-25T16:00:00Z', resolved: false },
  { id: 'fr2', studentId: 'student5', studentName: 'Suspicious User', type: 'Face Mismatch', severity: 'medium', description: 'Live selfie did not match CNIC photo (42% confidence)', timestamp: '2026-01-22T14:00:00Z', resolved: true },
  { id: 'fr3', studentId: 'student6', studentName: 'Test Account', type: 'Invalid Documents', severity: 'high', description: 'YOLO detected forged certificate layout', timestamp: '2026-01-28T11:00:00Z', resolved: false },
];

const sampleVerifications: VerificationRequest[] = [
  { id: 'vr1', degreeId: 'IQRA-CS-2026-70618', verifierEmail: 'hr@techcorp.com', verifiedAt: '2026-02-01T09:00:00Z', result: 'valid', blockchainVerified: true },
];

// ============================================================
// STATE INITIALISATION
// ============================================================

function getInitialState(): AppState {
  const empty: AppState = {
    currentUser: null,
    users: [],
    degreeApplications: [],
    blockchainTransactions: [],
    auditLogs: [],
    fraudReports: [],
    verificationRequests: [],
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return migrateState(JSON.parse(stored));
    }
  } catch {}

  if (import.meta.env.DEV) {
    return {
      ...empty,
      users: [...sampleStudents, sampleAdmin, sampleEmployer],
      degreeApplications: sampleDegreeApplications,
      blockchainTransactions: sampleBlockchainTx,
      auditLogs: sampleAuditLogs,
      fraudReports: sampleFraudReports,
      verificationRequests: sampleVerifications,
    };
  }

  return empty;
}

function migrateState(input: AppState): AppState {
  const users = input.users || [];
  const currentUser = input.currentUser
    ? users.find(user => user.id === input.currentUser?.id) || null
    : null;
  return {
    ...input,
    currentUser,
    users,
    degreeApplications: input.degreeApplications || [],
    blockchainTransactions: input.blockchainTransactions || [],
    auditLogs: input.auditLogs || [],
    fraudReports: input.fraudReports || [],
    verificationRequests: input.verificationRequests || [],
  };
}

const appStore = createStore<AppState>(() => getInitialState());

function getState(): AppState {
  return appStore.getState();
}

function patchState(reducer: (prev: AppState) => AppState) {
  appStore.setState(reducer(getState()));
  notify();
}

async function syncDegreesFromServer() {
  try {
    const result = await degreesApi.list();
    const rows = (result as { data?: Record<string, unknown>[] }).data ?? [];
    if (!Array.isArray(rows)) return;
    patchState((s) => ({
      ...s,
      degreeApplications: rows.map((row) => ({
        id: String(row.id ?? ''),
        studentId: String(row.studentId ?? row.student_id ?? ''),
        studentName: String(row.studentName ?? row.student_name ?? ''),
        registrationNumber: String(row.studentId ?? row.student_id ?? ''),
        department: String(row.fieldOfStudy ?? row.field_of_study ?? ''),
        program: String(row.degreeTitle ?? row.degree_title ?? ''),
        degreeTitle: String(row.degreeTitle ?? row.degree_title ?? ''),
        cgpa: Number(row.gpa ?? 0),
        graduationYear: String(row.graduationDate ?? row.graduation_date ?? ''),
        status: (row.status as DegreeApplication['status']) ?? 'pending',
        appliedAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
        blockchainHash: String(row.degreeHash ?? row.degree_hash ?? ''),
        degreeId: String(row.id ?? ''),
        fraudScore: 100,
        blockchainSyncStatus: row.blockchainSyncStatus as DegreeApplication['blockchainSyncStatus'],
      })),
    }));
  } catch (err) {
    console.warn('syncDegreesFromServer failed:', err);
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
  } catch {}
}

function notify() {
  persist();
}

// ============================================================
// STORE EXPORT (Zustand subscribe + legacy method surface)
// ============================================================

export const store = {
  subscribe(listener: () => void) {
    return appStore.subscribe(listener);
  },

  getState(): AppState {
    return getState();
  },

  syncFromServer: syncDegreesFromServer,

  // ---------- AUTH (uses backend API) ----------
  async login(email: string, password: string): Promise<User | null> {
    try {
      const data = await authApi.login(email, password);
      // After envelope unwrapping, data contains { accessToken, refreshToken, user }
      // setToken expects only the access token (the refresh token is handled internally)
      setToken(data.accessToken);
      const user = data.user as User;

      const existing = getState().users.find(u => u.id === user.id);
      if (!existing) {
        patchState(s => ({ ...s, users: [...s.users, user] }));
      } else {
        Object.assign(existing, user);
      }
      patchState(s => ({ ...s, currentUser: user }));
      store.addAuditLog('User Login', user.id, user.name, `Logged in from ${email}`, 'auth');
      await syncDegreesFromServer();
      notify();
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  },

  async register(
    name: string,
    email: string,
    regNo: string,
    password: string,
    role: UserRole
  ): Promise<User> {
    const data = await authApi.register({ name, email, registrationNumber: regNo, password, role });
    // Register may or may not return an accessToken (depending on backend config)
    // If it does, we store it.
    if (data.accessToken) {
      setToken(data.accessToken);   // FIX: only one argument
    }
    const user = data.user as User;
    const existing = getState().users.find(u => u.id === user.id);
    if (!existing) {
      patchState(s => ({ ...s, users: [...s.users, user] }));
    } else {
      Object.assign(existing, user);
    }
    patchState(s => ({ ...s, currentUser: user }));
    store.addAuditLog('User Registration', user.id, user.name, `Registered as ${role}`, 'auth');
    await syncDegreesFromServer();
    notify();
    return user;
  },

  // ========== NEW: setUser ==========
  // Use this after a login via authApi (outside the store) to sync the store getState().
  setUser(user: User) {
    const existing = getState().users.find(u => u.id === user.id);
    if (!existing) {
      patchState(s => ({ ...s, users: [...s.users, user] }));
    } else {
      Object.assign(existing, user);
    }
    patchState(s => ({ ...s, currentUser: user }));
    notify();
    syncDegreesFromServer();
  },
  // ====================================

  logout() {
    if (getState().currentUser) {
      store.addAuditLog('User Logout', getState().currentUser.id, getState().currentUser.name, 'User logged out', 'auth');
    }
    clearToken();
    patchState(s => ({ ...s, currentUser: null }));
    notify();
  },

  // ---------- DOCUMENTS (uses backend API) ----------
  async uploadDocument(userId: string, doc: UploadedDocument, file: File) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('metadata', JSON.stringify({
      type: doc.type,
      fileName: doc.fileName,
      userId,
    }));
    const result = await documentsApi.upload(formData);
    const newDoc: UploadedDocument = {
      id: result.documentId,
      type: doc.type,
      fileName: doc.fileName,
      uploadedAt: new Date().toISOString(),
      ocrStatus: 'pending',
      yoloStatus: 'pending',
      extractedData: {},
    };
    patchState(s => ({
      ...s,
      users: s.users.map(u => {
        if (u.id === userId) {
          const docs = u.documents ? [...u.documents, newDoc] : [newDoc];
          return { ...u, documents: docs, verificationStatus: 'documents_uploaded' as const };
        }
        return u;
      }),
    }));
    if (getState().currentUser?.id === userId) {
      const updated = getState().users.find(u => u.id === userId);
      if (updated) patchState(s => ({ ...s, currentUser: updated }));
    }
    store.addAuditLog('Document Upload', userId, getState().users.find(u => u.id === userId)?.name || '', `Uploaded ${doc.type}: ${doc.fileName}`, 'verification');
    notify();
    return result;
  },

  // ---------- SIMULATIONS (local only – replace with backend calls later) ----------
  simulateOCR(userId: string, docId: string, extractedData?: Record<string, string>) {
    patchState(s => ({
      ...s,
      users: s.users.map(u => {
        if (u.id === userId && u.documents) {
          return {
            ...u,
            documents: u.documents.map(d => d.id === docId ? {
              ...d,
              ocrStatus: 'verified' as const,
              extractedData: extractedData || { status: 'Verified' }
            } : d),
            verificationStatus: 'ocr_verified' as const,
          };
        }
        return u;
      }),
    }));
    if (getState().currentUser?.id === userId) {
      const updated = getState().users.find(u => u.id === userId);
      if (updated) patchState(s => ({ ...s, currentUser: updated }));
    }
    notify();
  },

  simulateYOLO(userId: string, docId: string, result: 'valid' | 'suspicious' | 'fraudulent' = 'valid') {
    patchState(s => ({
      ...s,
      users: s.users.map(u => {
        if (u.id === userId && u.documents) {
          return {
            ...u,
            documents: u.documents.map(d => d.id === docId ? { ...d, yoloStatus: result } : d),
          };
        }
        return u;
      }),
    }));
    if (getState().currentUser?.id === userId) {
      const updated = getState().users.find(u => u.id === userId);
      if (updated) patchState(s => ({ ...s, currentUser: updated }));
    }
    notify();
  },

  completeFaceVerification(userId: string) {
    patchState(s => ({
      ...s,
      users: getState().users.map(u => u.id === userId ? { ...u, verificationStatus: 'face_verified' as const } : u),
    }));
    if (getState().currentUser?.id === userId) {
      const updated = getState().users.find(u => u.id === userId);
      if (updated) patchState(s => ({ ...s, currentUser: updated }));
    }
    store.addAuditLog('Face Verification', userId, getState().users.find(u => u.id === userId)?.name || '', 'Face verification passed (simulated)', 'verification');
    notify();
  },

  // ---------- ADMIN ACTIONS ----------
  approveStudent(userId: string) {
    patchState(s => ({
      ...s,
      users: getState().users.map(u => u.id === userId ? { ...u, verificationStatus: 'approved' as const } : u),
    }));
    const student = getState().users.find(u => u.id === userId);
    store.addAuditLog('Student Approved', 'admin1', 'Administrator', `Approved student ${student?.name}`, 'admin');
    notify();
  },

  rejectStudent(userId: string) {
    patchState(s => ({
      ...s,
      users: getState().users.map(u => u.id === userId ? { ...u, verificationStatus: 'rejected' as const } : u),
    }));
    notify();
  },

  // ---------- DEGREE APPLICATIONS (uses backend API) ----------
  async applyForDegree(app: Omit<DegreeApplication, 'id' | 'status' | 'appliedAt' | 'fraudScore'>) {
    const result = await degreesApi.apply({
      degree_title: app.degreeTitle,
      field_of_study: app.department,
      graduation_date: `${app.graduationYear}-06-01`,
      gpa: app.cgpa,
    });
    const degreeData = (result as { degree?: Record<string, unknown> })?.degree || result as Record<string, unknown>;
    const newApp: DegreeApplication = {
      id: String(degreeData.id ?? ''),
      studentId: app.studentId,
      studentName: app.studentName,
      registrationNumber: app.registrationNumber,
      department: app.department,
      program: app.program,
      degreeTitle: app.degreeTitle,
      cgpa: app.cgpa,
      admissionYear: app.admissionYear,
      graduationYear: app.graduationYear,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      blockchainHash: String(degreeData.degreeHash ?? degreeData.degree_hash ?? ''),
      degreeId: String(degreeData.id ?? ''),
      fraudScore: 100,
    };
    patchState(s => ({ ...s, degreeApplications: [...s.degreeApplications, newApp] }));
    store.addAuditLog('Degree Applied', app.studentId || '', app.studentName, `Applied for ${app.degreeTitle}`, 'degree');
    notify();
    return newApp;
  },

  // FIX: Add 'reason' parameter and pass it to the API
  async revokeDegree(degreeId: string, reason: string = 'No reason provided') {
    const degree = getState().degreeApplications.find(d => d.id === degreeId);
    if (!degree || !degree.degreeId) throw new Error('Degree not found or missing degreeId');
    await degreesApi.revoke(degree.degreeId, reason);  // now pass reason
    patchState(s => ({
      ...s,
      degreeApplications: getState().degreeApplications.map(d =>
        d.id === degreeId ? { ...d, status: 'revoked' as const } : d
      ),
    }));
    store.addAuditLog('Degree Revoked', 'admin1', 'Administrator', `Revoked degree ${degree.degreeId} with reason: ${reason}`, 'degree');
    notify();
  },

  // ---------- VERIFICATION (uses backend API) ----------
  verifyDegree(degreeIdOrHash: string): DegreeApplication | null {
    return getState().degreeApplications.find(d =>
      d.degreeId === degreeIdOrHash || d.blockchainHash === degreeIdOrHash
    ) || null;
  },

  async verifyDegreeStrict(degreeIdOrHash: string) {
    const result = await verificationApi.verifyPublic(degreeIdOrHash);
    return {
      valid: result.valid,
      isRevoked: !result.valid,
      degree: {
        student_name: result.degreeDetails?.studentName,
        degree_title: result.degreeDetails?.degreeTitle,
        registration_number: result.degreeDetails?.registrationNumber,
      },
      blockchain: result.blockchain,
    };
  },

  // ---------- AUDIT LOGS (local only) ----------
  addAuditLog(action: string, userId: string, userName: string, details: string, category: AuditLog['category']) {
    const log: AuditLog = {
      id: generateId(),
      action,
      userId,
      userName,
      timestamp: new Date().toISOString(),
      details,
      category,
    };
    patchState(s => ({ ...s, auditLogs: [...s.auditLogs, log] }));
  },

  // ---------- OTHER METHODS ----------
  updateUserProfile(userId: string, updates: Partial<User>) {
    patchState(s => ({
      ...s,
      users: s.users.map(u => u.id === userId ? { ...u, ...updates } : u),
    }));
    if (getState().currentUser?.id === userId) {
      const updated = getState().users.find(u => u.id === userId);
      if (updated) patchState(s => ({ ...s, currentUser: updated }));
    }
    notify();
  },

  validateDocumentData(userId: string, docId: string) {
    const user = getState().users.find(u => u.id === userId);
    const doc = user?.documents?.find(d => d.id === docId);
    const errors: string[] = [];
    if (!user || !doc) {
      errors.push('Document or user not found');
      return { isValid: false, errors };
    }
    // Simple validation logic (can be expanded)
    const isValid = errors.length === 0;
    patchState(s => ({
      ...s,
      users: s.users.map(u => {
        if (u.id === userId && u.documents) {
          return {
            ...u,
            documents: u.documents.map(d =>
              d.id === docId
                ? { ...d, validationStatus: isValid ? 'valid' : 'mismatch', validationErrors: errors }
                : d
            ),
          };
        }
        return u;
      }),
    }));
    if (getState().currentUser?.id === userId) {
      const updated = getState().users.find(u => u.id === userId);
      if (updated) patchState(s => ({ ...s, currentUser: updated }));
    }
    notify();
    return { isValid, errors };
  },

  removeDocument(userId: string, docId: string) {
    const user = getState().users.find(u => u.id === userId);
    const doc = user?.documents?.find(d => d.id === docId);
    if (!user || !doc) {
      console.error('Document or user not found');
      return;
    }
    patchState(s => ({
      ...s,
      users: s.users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            documents: u.documents?.filter(d => d.id !== docId),
          };
        }
        return u;
      }),
    }));
    if (getState().currentUser?.id === userId) {
      const updated = getState().users.find(u => u.id === userId);
      if (updated) patchState(s => ({ ...s, currentUser: updated }));
    }
    store.addAuditLog('Document Removed', userId, user.name, `Removed ${doc.type}: ${doc.fileName}`, 'verification');
    notify();
  },

  resetData() {
    localStorage.removeItem(STORAGE_KEY);
    appStore.setState(getInitialState(), true);
    clearToken();
    notify();
  },

  // ---------- DATA PERSISTENCE (stubbed – no longer used) ----------
  createDataBackup() {
    console.warn('Local backup is disabled. All data is stored on the backend.');
    return null;
  },

  restoreFromBackup() {
    console.warn('Local restore is disabled. All data is stored on the backend.');
    return null;
  },

  exportAllData() {
    console.warn('Export is disabled. Data is available via backend APIs.');
  },

  importData(_file: File) {
    console.warn('Import is disabled. Data is managed via backend APIs.');
    return null;
  },

  getStorageStats() {
    return { total: 0, used: 0, documents: 0 };
  },

  getStoragePercentage() {
    return 0;
  },

  getStorageWarning() {
    return null;
  },

  clearOldDocuments(_daysOld: number = 90) {
    console.warn('Clear old local documents is disabled.');
    return 0;
  },

  verifyDataIntegrity() {
    console.warn('Local data integrity check is disabled.');
    return { valid: true, errors: [] };
  },
};