import { User, DegreeApplication, BlockchainTransaction, AuditLog, FraudReport, VerificationRequest, UploadedDocument, UserRole } from './types';
import { hashPassword, hashPasswordWithSalt, verifyPassword } from './lib/auth';
import { issueDegreeOnChain, revokeDegreeOnChain, verifyByHashOnChain } from './lib/blockchainService';
import { runFraudChecks } from './lib/fraudDetection';
import { BackupManager, StorageManager } from './lib/dataPersistence';

// Browser-local store. External database/blockchain integrations can replace this boundary later.
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

// Note: assuming createDegreeId is moved to a shared utility or kept in src/lib/blockchain.ts
// For the purpose of this diff, we use a placeholder or assume it's imported correctly.
import { createDegreeId } from './lib/blockchain';

function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Sample data
const sampleStudents: User[] = [
  // {
  //   id: 'student1',
  //   name: 'Madan Kumar',
  //   email: 'madan.70618@iqra.edu.pk',
  //   passwordHash: hashPasswordWithSalt('demo123', 'demo-student1'),
  //   registrationNumber: '70618',
  //   role: 'student',
  //   verificationStatus: 'approved',
  //   fatherName: 'Raj Kumar',
  //   cnicNumber: '42201-1234567-1',
  //   department: 'Computer Science',
  //   program: 'BS Computer Science',
  //   admissionYear: 2022,
  //   graduationYear: 2026,
  //   cgpa: 3.74,
  //   profilePhoto: '',
  //   documents: [
  //     { id: 'doc1', type: 'cnic', fileName: 'cnic_front.jpg', uploadedAt: '2025-01-15', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: { name: 'Madan Kumar', cnic: '42201-1234567-1' } },
  //     { id: 'doc2', type: 'marksheet', fileName: 'marksheet_2024.pdf', uploadedAt: '2025-01-15', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: { cgpa: '3.74', board: 'Iqra University' } },
  //     { id: 'doc3', type: 'certificate', fileName: 'intermediate_cert.pdf', uploadedAt: '2025-01-15', ocrStatus: 'verified', yoloStatus: 'valid', extractedData: {} },
  //   ],
  //   createdAt: '2025-01-10',
  // },
  {
    id: 'student2',
    name: 'Ayesha Khan',
    email: 'ayesha.70425@iqra.edu.pk',
    passwordHash: hashPasswordWithSalt('demo123', 'demo-student2'),
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
    passwordHash: hashPasswordWithSalt('demo123', 'demo-student3'),
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
    passwordHash: hashPasswordWithSalt('demo123', 'demo-student4'),
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
  passwordHash: hashPasswordWithSalt('demo123', 'demo-admin1'),
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
  passwordHash: hashPasswordWithSalt('demo123', 'demo-employer1'),
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

function getInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return migrateState(JSON.parse(stored));
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

function migrateState(input: AppState): AppState {
  const users = (input.users || []).map(user => ({
    ...user,
    passwordHash: user.passwordHash || hashPasswordWithSalt('demo123', `legacy-${user.id}`),
  }));
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
  login(email: string, password: string): User | null {
    const normalizedEmail = email.trim().toLowerCase();
    const user = state.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (user && verifyPassword(password, user.passwordHash)) {
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

  register(name: string, email: string, regNo: string, password: string, role: UserRole): User {
    if (state.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }

    if (state.users.some(u => u.registrationNumber === regNo.trim())) {
      throw new Error('An account with this registration number already exists.');
    }

    const newUser: User = {
      id: generateId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      registrationNumber: regNo.trim(),
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
            // Update overall verification status, assuming OCR is a step
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
    // After OCR, immediately validate the document data against user profile
    // This ensures `validationStatus` and `validationErrors` are set.
    if (docId) {
      store.validateDocumentData(userId, docId);
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
    // After YOLO, re-validate the document data against user profile
    // This ensures `validationStatus` and `validationErrors` are updated if YOLO flags something.
    if (docId) {
      store.validateDocumentData(userId, docId);
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
    const student = state.users.find(u => u.id === app.studentId);
    const fraudCheck = runFraudChecks(
      student,
      state.users,
      { ...app, status: 'pending' },
      state.degreeApplications,
    );
    const newApp: DegreeApplication = {
      ...app,
      id: generateId(),
      status: 'pending',
      appliedAt: new Date().toISOString(),
      fraudScore: fraudCheck.score,
    };
    state = { ...state, degreeApplications: [...state.degreeApplications, newApp] };
    store.addAuditLog('Degree Applied', app.studentId, app.studentName, `Applied for ${app.degreeTitle}`, 'degree');
    if (fraudCheck.severity !== 'safe') {
      const report: FraudReport = {
        id: generateId(),
        studentId: app.studentId,
        studentName: app.studentName,
        type: 'Degree Application Review',
        severity: fraudCheck.severity,
        description: fraudCheck.flags.join(' '),
        timestamp: new Date().toISOString(),
        resolved: false,
      };
      state = { ...state, fraudReports: [...state.fraudReports, report] };
      store.addAuditLog('Fraud Review Flagged', app.studentId, app.studentName, fraudCheck.flags.join(' '), 'fraud');
    }
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

  async issueDegree(degreeId: string) {
    const degree = state.degreeApplications.find(d => d.id === degreeId);
    if (!degree) return;

    try {
      const dId = createDegreeId(degree);
      
      const result = await issueDegreeOnChain({
        degreeId: dId,
        studentName: degree.studentName,
        registrationNumber: degree.registrationNumber,
        program: degree.program,
        department: degree.department,
        admissionYear: degree.admissionYear,
        graduationYear: degree.graduationYear,
        cgpaX100: Math.round(degree.cgpa * 100),
      });

      state = {
        ...state,
        degreeApplications: state.degreeApplications.map(d => {
          if (d.id === degreeId) {
            return {
              ...d,
              status: 'issued' as const,
              approvedAt: d.approvedAt || new Date(result.timestamp * 1000).toISOString(),
              blockchainHash: result.degreeHash,
              degreeId: dId,
              qrCodeData: `https://blockdegree.iqra.edu.pk/verify/${dId}`,
            };
          }
          return d;
        }),
      };

      const deg = state.degreeApplications.find(d => d.id === degreeId)!;
      // Use the connected wallet address if available, otherwise placeholder
      const issuer = (window.ethereum as any)?.selectedAddress || '0xUniversityAdminWallet';
      
      const newTx: BlockchainTransaction = {
        id: generateId(),
        txHash: result.txHash,
        degreeId: deg.degreeId!,
        studentRegNo: deg.registrationNumber,
        degreeHash: result.degreeHash,
        timestamp: new Date(result.timestamp * 1000).toISOString(),
        issuerAddress: issuer,
        blockNumber: result.blockNumber,
        gasUsed: 0,
        status: 'confirmed',
      };
      state = { ...state, blockchainTransactions: [...state.blockchainTransactions, newTx] };

      store.addAuditLog('Degree Issued', 'admin1', 'Administrator', `Issued degree ${deg.degreeId} to ${deg.studentName}`, 'degree');
      notify();
    } catch (error) {
      console.error('Blockchain issuance failed:', error);
      throw error;
    }
  },

  async revokeDegree(degreeId: string) {
    const degree = state.degreeApplications.find(d => d.id === degreeId);
    if (!degree || !degree.degreeId) return;

    try {
      const result = await revokeDegreeOnChain(degree.degreeId);
      state = {
        ...state,
        degreeApplications: state.degreeApplications.map(d => 
          d.id === degreeId ? { ...d, status: 'revoked' as const } : d
        ),
      };
      store.addAuditLog('Degree Revoked', 'admin1', 'Administrator', `Revoked degree ${degree.degreeId}`, 'degree');
      notify();
      return result;
    } catch (error) {
      console.error('Blockchain revocation failed:', error);
      throw error;
    }
  },

  /**
   * Basic Degree Lookup
   */
  verifyDegree(degreeIdOrHash: string): DegreeApplication | null {
    return state.degreeApplications.find(d =>
      d.degreeId === degreeIdOrHash || d.blockchainHash === degreeIdOrHash
    ) || null;
  },

  /**
   * Deep Verification Logic
   * Rejects degrees if the supporting evidence (OCR/Docs) is invalid.
   */
  async verifyDegreeStrict(degreeIdOrHash: string): Promise<(DegreeApplication & { valid: boolean; errors: string[] }) | null> {
    const degree = this.verifyDegree(degreeIdOrHash);
    if (!degree) return null;

    const student = state.users.find(u => u.id === degree.studentId);
    const errors: string[] = [];

    // REAL BLOCKCHAIN VERIFICATION
    if (degree.blockchainHash) {
      try {
        const chainRes = await verifyByHashOnChain(degree.blockchainHash);
        if (!chainRes.valid) errors.push(chainRes.message);
        if (chainRes.revoked) errors.push('Degree has been revoked on the blockchain.');
      } catch (err) {
        errors.push('Blockchain verification failed to reach the network.');
      }
    }

    if (!student) {
      errors.push('Student record not found for this degree.');
    } else {
      // Check if all required docs exist AND have passed validation.
      const required = ['cnic', 'marksheet', 'certificate'] as const;

      required.forEach(type => {
        const doc = student.documents?.find(d => d.type === type);

        if (!doc) {
          errors.push(`Supporting ${type} is missing.`);
          return;
        }

        if (doc.validationStatus !== 'valid') {
          const extra = doc.validationErrors?.length ? ` Details: ${doc.validationErrors.join('; ')}` : '';
          errors.push(`Supporting ${type} failed data validation.${extra}`);
          return;
        }

        // Hard guarantee: strict verification must not pass if extracted OCR payload is missing.
        if (!doc.extractedData || Object.keys(doc.extractedData).length === 0) {
          errors.push(`Supporting ${type} has no extracted OCR data (cannot verify integrity).`);
        }
      });
    }

    return { ...degree, valid: errors.length === 0, errors };
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

  // Validate document data against user profile
  validateDocumentData(userId: string, docId: string): { isValid: boolean; errors: string[] } {
    const user = state.users.find(u => u.id === userId);
    const doc = user?.documents?.find(d => d.id === docId);

    const errors: string[] = [];

    if (!user || !doc) {
      errors.push('Document or user not found');
      return { isValid: false, errors };
    }

    if (!doc.extractedData || Object.keys(doc.extractedData).length === 0) {
      errors.push('No extracted data available for validation');
      return { isValid: false, errors };
    }

    const extracted = doc.extractedData;

    // Validate Name
    if (extracted['Name'] && user.name) {
      const extractedName = extracted['Name'].toLowerCase().trim();
      const userName = user.name.toLowerCase().trim();
      if (extractedName !== userName && !userName.includes(extractedName.split(' ')[0])) {
        errors.push(`Name mismatch: Document shows "${extracted['Name']}" but profile has "${user.name}"`);
      }
    }

    // Validate CNIC
    if (extracted['CNIC Number'] && user.cnicNumber) {
      const extractedCNIC = extracted['CNIC Number'].replace(/\s/g, '').replace(/-/g, '');
      const userCNIC = user.cnicNumber.replace(/\s/g, '').replace(/-/g, '');
      if (extractedCNIC !== userCNIC) {
        errors.push(`CNIC mismatch: Document shows "${extracted['CNIC Number']}" but profile has "${user.cnicNumber}"`);
      }
    }

    // Validate Father Name
    if (extracted['Father Name'] && user.fatherName) {
      const extractedFather = extracted['Father Name'].toLowerCase().trim();
      const userFather = user.fatherName.toLowerCase().trim();
      if (extractedFather !== userFather && !userFather.includes(extractedFather.split(' ')[0])) {
        errors.push(`Father name mismatch: Document shows "${extracted['Father Name']}" but profile has "${user.fatherName}"`);
      }
    }

    // Validate Registration Number
    if (extracted['Registration No'] && user.registrationNumber) {
      if (extracted['Registration No'] !== user.registrationNumber) {
        errors.push(`Registration number mismatch: Document shows "${extracted['Registration No']}" but profile has "${user.registrationNumber}"`);
      }
    }

    // For marksheet and certificate, validate CGPA
    if ((doc.type === 'marksheet' || doc.type === 'certificate') && extracted['CGPA']) {
      if (user.cgpa) {
        const docCGPA = parseFloat(extracted['CGPA']);
        const userCGPA = user.cgpa;
        if (Math.abs(docCGPA - userCGPA) > 0.05) {
          errors.push(`CGPA mismatch: Document shows "${extracted['CGPA']}" but profile has "${user.cgpa}"`);
        }
      }
    }

    const isValid = errors.length === 0;

    // Update document validation status
    state = {
      ...state,
      users: state.users.map(u => {
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
    };

    if (state.currentUser?.id === userId) {
      const updated = state.users.find(u => u.id === userId);
      if (updated) state = { ...state, currentUser: updated };
    }

    const logStatus = isValid ? 'PASSED' : 'FAILED';
    const logDetails = isValid ? 'Data matched successfully' : errors.join('; ');
    store.addAuditLog('Document Validation', userId, user.name, `Validation ${logStatus}: ${logDetails}`, 'verification');

    notify();
    return { isValid, errors };
  },

  // Remove document
  removeDocument(userId: string, docId: string) {
    const user = state.users.find(u => u.id === userId);
    const doc = user?.documents?.find(d => d.id === docId);

    if (!user || !doc) {
      console.error('Document or user not found');
      return;
    }

    state = {
      ...state,
      users: state.users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            documents: u.documents?.filter(d => d.id !== docId),
          };
        }
        return u;
      }),
    };

    if (state.currentUser?.id === userId) {
      const updated = state.users.find(u => u.id === userId);
      if (updated) state = { ...state, currentUser: updated };
    }

    store.addAuditLog('Document Removed', userId, user.name, `Removed ${doc.type}: ${doc.fileName}`, 'verification');
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

  // Data Persistence Methods
  /**
   * Create a backup of all data
   */
  createDataBackup() {
    return BackupManager.createBackup();
  },

  /**
   * Restore from backup
   */
  restoreFromBackup() {
    return BackupManager.restoreBackup();
  },

  /**
   * Export all data as JSON
   */
  exportAllData() {
    BackupManager.exportAllData();
  },

  /**
   * Import data from JSON file
   */
  importData(file: File) {
    return BackupManager.importData(file);
  },

  /**
   * Get storage statistics
   */
  getStorageStats() {
    return StorageManager.getStorageStats();
  },

  /**
   * Get storage usage percentage
   */
  getStoragePercentage() {
    return StorageManager.getStoragePercentage();
  },

  /**
   * Get storage warning message
   */
  getStorageWarning() {
    return StorageManager.getStorageWarning();
  },

  /**
   * Clear old documents
   */
  clearOldDocuments(daysOld: number = 90) {
    return StorageManager.clearOldDocuments(daysOld);
  },

  /**
   * Verify data integrity
   */
  verifyDataIntegrity() {
    return StorageManager.verifyDataIntegrity();
  },
};
