import { User, DegreeApplication, BlockchainTransaction, AuditLog, FraudReport, VerificationRequest, UploadedDocument, UserRole } from './types';

// Simulated data store
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

function generateHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function generateEthAddress(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)];
  }
  return addr;
}

// Sample data
const sampleStudents: User[] = [
  {
    id: 'student1',
    name: 'Madan Kumar',
    email: 'madan.70618@iqra.edu.pk',
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
  { id: 'log9', action: 'Blockchain Attestation', userId: 'system', userName: 'System', timestamp: '2026-01-20T10:30:00Z', details: 'Degree hash recorded on Ethereum blockchain (Block #15234)', category: 'blockchain' },
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

function getInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {
    currentUser: null,
    users: [...sampleStudents, sampleAdmin, sampleEmployer],
    degreeApplications: sampleDegreeApplications,
    blockchainTransactions: sampleBlockchainTx,
    auditLogs: sampleAuditLogs,
    fraudReports: sampleFraudReports,
    verificationRequests: sampleVerifications,
  };
}

let state: AppState = getInitialState();
let listeners: Array<() => void> = [];

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function notify() {
  persist();
  listeners.forEach(l => l());
}

export const store = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },

  getState(): AppState {
    return state;
  },

  // Auth
  login(email: string, _password: string): User | null {
    const user = state.users.find(u => u.email === email);
    if (user) {
      state = { ...state, currentUser: user };
      store.addAuditLog('User Login', user.id, user.name, `Logged in from ${email}`, 'auth');
      notify();
      return user;
    }
    return null;
  },

  logout() {
    if (state.currentUser) {
      store.addAuditLog('User Logout', state.currentUser.id, state.currentUser.name, 'User logged out', 'auth');
    }
    state = { ...state, currentUser: null };
    notify();
  },

  register(name: string, email: string, regNo: string, role: UserRole): User {
    const newUser: User = {
      id: generateId(),
      name,
      email,
      registrationNumber: regNo,
      role,
      verificationStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    state = { ...state, users: [...state.users, newUser], currentUser: newUser };
    store.addAuditLog('User Registration', newUser.id, newUser.name, `Registered as ${role}`, 'auth');
    notify();
    return newUser;
  },

  // Documents
  uploadDocument(userId: string, doc: UploadedDocument) {
    state = {
      ...state,
      users: state.users.map(u => {
        if (u.id === userId) {
          const docs = u.documents ? [...u.documents, doc] : [doc];
          return { ...u, documents: docs, verificationStatus: 'documents_uploaded' as const };
        }
        return u;
      }),
    };
    const user = state.users.find(u => u.id === userId);
    store.addAuditLog('Document Upload', userId, user?.name || '', `Uploaded ${doc.type}: ${doc.fileName}`, 'verification');
    if (state.currentUser?.id === userId) {
      const updated = state.users.find(u => u.id === userId);
      if (updated) state = { ...state, currentUser: updated };
    }
    notify();
  },

  // Simulate OCR processing with optional extracted data
  simulateOCR(userId: string, docId: string, extractedData?: Record<string, string>) {
    state = {
      ...state,
      users: state.users.map(u => {
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
    };
    if (state.currentUser?.id === userId) {
      const updated = state.users.find(u => u.id === userId);
      if (updated) state = { ...state, currentUser: updated };
    }
    const user = state.users.find(u => u.id === userId);
    store.addAuditLog('OCR Verification', userId, user?.name || '', `Document ${docId} OCR completed`, 'verification');
    notify();
  },

  // Simulate YOLO validation with result
  simulateYOLO(userId: string, docId: string, result: 'valid' | 'suspicious' | 'fraudulent' = 'valid') {
    state = {
      ...state,
      users: state.users.map(u => {
        if (u.id === userId && u.documents) {
          return {
            ...u,
            documents: u.documents.map(d => d.id === docId ? { ...d, yoloStatus: result } : d),
          };
        }
        return u;
      }),
    };
    if (state.currentUser?.id === userId) {
      const updated = state.users.find(u => u.id === userId);
      if (updated) state = { ...state, currentUser: updated };
    }
    const user = state.users.find(u => u.id === userId);
    store.addAuditLog('YOLO Analysis', userId, user?.name || '', `Document ${docId} YOLO result: ${result}`, 'verification');
    notify();
  },

  // Face verification
  completeFaceVerification(userId: string) {
    state = {
      ...state,
      users: state.users.map(u => u.id === userId ? { ...u, verificationStatus: 'face_verified' as const } : u),
    };
    if (state.currentUser?.id === userId) {
      const updated = state.users.find(u => u.id === userId);
      if (updated) state = { ...state, currentUser: updated };
    }
    store.addAuditLog('Face Verification', userId, state.users.find(u => u.id === userId)?.name || '', 'Face verification passed', 'verification');
    notify();
  },

  // Admin approve student
  approveStudent(userId: string) {
    state = {
      ...state,
      users: state.users.map(u => u.id === userId ? { ...u, verificationStatus: 'approved' as const } : u),
    };
    const student = state.users.find(u => u.id === userId);
    store.addAuditLog('Student Approved', 'admin1', 'Administrator', `Approved student ${student?.name}`, 'admin');
    notify();
  },

  rejectStudent(userId: string) {
    state = {
      ...state,
      users: state.users.map(u => u.id === userId ? { ...u, verificationStatus: 'rejected' as const } : u),
    };
    notify();
  },

  // Degree applications
  applyForDegree(app: Omit<DegreeApplication, 'id' | 'status' | 'appliedAt' | 'fraudScore'>) {
    const newApp: DegreeApplication = {
      ...app,
      id: generateId(),
      status: 'pending',
      appliedAt: new Date().toISOString(),
      fraudScore: Math.floor(Math.random() * 20) + 80,
    };
    state = { ...state, degreeApplications: [...state.degreeApplications, newApp] };
    store.addAuditLog('Degree Applied', app.studentId, app.studentName, `Applied for ${app.degreeTitle}`, 'degree');
    notify();
    return newApp;
  },

  approveDegree(degreeId: string) {
    state = {
      ...state,
      degreeApplications: state.degreeApplications.map(d => {
        if (d.id === degreeId) {
          return { ...d, status: 'approved' as const, approvedAt: new Date().toISOString() };
        }
        return d;
      }),
    };
    notify();
  },

  issueDegree(degreeId: string) {
    const hash = generateHash();
    const txHash = generateHash();
    const issuerAddress = generateEthAddress();
    const blockNumber = Math.floor(Math.random() * 10000) + 15000;

    state = {
      ...state,
      degreeApplications: state.degreeApplications.map(d => {
        if (d.id === degreeId) {
          const dId = `IQRA-${d.department.substring(0, 2).toUpperCase()}-${d.graduationYear}-${d.registrationNumber}`;
          return {
            ...d,
            status: 'issued' as const,
            blockchainHash: hash,
            degreeId: dId,
            qrCodeData: `https://blockdegree.iqra.edu.pk/verify/${dId}`,
          };
        }
        return d;
      }),
    };

    const deg = state.degreeApplications.find(d => d.id === degreeId)!;
    const newTx: BlockchainTransaction = {
      id: generateId(),
      txHash,
      degreeId: deg.degreeId!,
      studentRegNo: deg.registrationNumber,
      degreeHash: hash,
      timestamp: new Date().toISOString(),
      issuerAddress,
      blockNumber,
      gasUsed: Math.floor(Math.random() * 30000) + 70000,
      status: 'confirmed',
    };
    state = { ...state, blockchainTransactions: [...state.blockchainTransactions, newTx] };

    store.addAuditLog('Degree Issued', 'admin1', 'Administrator', `Issued degree ${deg.degreeId} to ${deg.studentName}`, 'degree');
    store.addAuditLog('Blockchain Attestation', 'system', 'System', `Degree hash ${hash.substring(0, 20)}... recorded on block #${blockNumber}`, 'blockchain');
    notify();
  },

  revokeDegree(degreeId: string) {
    state = {
      ...state,
      degreeApplications: state.degreeApplications.map(d => d.id === degreeId ? { ...d, status: 'revoked' as const } : d),
    };
    notify();
  },

  // Verify degree
  verifyDegree(degreeIdOrHash: string): DegreeApplication | null {
    return state.degreeApplications.find(d =>
      d.degreeId === degreeIdOrHash || d.blockchainHash === degreeIdOrHash
    ) || null;
  },

  // Audit
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
    state = { ...state, auditLogs: [...state.auditLogs, log] };
  },

  // Update user profile
  updateUserProfile(userId: string, updates: Partial<User>) {
    state = {
      ...state,
      users: state.users.map(u => u.id === userId ? { ...u, ...updates } : u),
    };
    if (state.currentUser?.id === userId) {
      const updated = state.users.find(u => u.id === userId);
      if (updated) state = { ...state, currentUser: updated };
    }
    notify();
  },

  // Reset data
  resetData() {
    localStorage.removeItem(STORAGE_KEY);
    state = {
      currentUser: null,
      users: [...sampleStudents, sampleAdmin, sampleEmployer],
      degreeApplications: sampleDegreeApplications,
      blockchainTransactions: sampleBlockchainTx,
      auditLogs: sampleAuditLogs,
      fraudReports: sampleFraudReports,
      verificationRequests: sampleVerifications,
    };
    notify();
  },
};
