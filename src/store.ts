import { User, Degree, VerificationResult, FraudReport, AuditLog, BlockchainTransaction } from './types';

// Simulated SHA256 hash generator
export function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return '0x' + hex.repeat(8).substring(0, 64);
}

export function generateTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return hash;
}

export function generateWallet(): string {
  const chars = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * 16)];
  }
  return addr;
}

// Pre-seeded users
export const USERS: User[] = [
  {
    id: 'admin-1',
    name: 'System Administrator',
    email: 'admin@blockdegree.io',
    role: 'admin',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  },
  {
    id: 'uni-1',
    name: 'ABC University',
    email: 'registrar@abcuni.edu',
    role: 'university',
    walletAddress: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
    organization: 'ABC University',
  },
  {
    id: 'uni-2',
    name: 'XYZ University',
    email: 'registrar@xyzuni.edu',
    role: 'university',
    walletAddress: '0xFEDCBA0987654321FEDCBA0987654321FEDCBA09',
    organization: 'XYZ University',
  },
  {
    id: 'stu-1',
    name: 'Ali Ahmed',
    email: 'ali.ahmed@student.edu',
    role: 'student',
    walletAddress: '0x1111111111111111111111111111111111111111',
  },
  {
    id: 'stu-2',
    name: 'Sara Khan',
    email: 'sara.khan@student.edu',
    role: 'student',
    walletAddress: '0x2222222222222222222222222222222222222222',
  },
  {
    id: 'stu-3',
    name: 'Ahmed Raza',
    email: 'ahmed.raza@student.edu',
    role: 'student',
    walletAddress: '0x3333333333333333333333333333333333333333',
  },
  {
    id: 'emp-1',
    name: 'TechCorp Ltd',
    email: 'hr@techcorp.com',
    role: 'employer',
    walletAddress: '0x4444444444444444444444444444444444444444',
    organization: 'TechCorp Ltd',
  },
  {
    id: 'emp-2',
    name: 'FutureSoft Pvt Ltd',
    email: 'hr@futuresoft.com',
    role: 'employer',
    walletAddress: '0x5555555555555555555555555555555555555555',
    organization: 'FutureSoft Pvt Ltd',
  },
];

// Pre-seeded degrees
const now = Date.now();
export const INITIAL_DEGREES: Degree[] = [
  {
    id: 'deg-1',
    studentName: 'Ali Ahmed',
    studentId: 'STU-2024-001',
    program: 'BS Computer Science',
    university: 'ABC University',
    graduationDate: '2024-06-15',
    degreeHash: generateHash('Ali Ahmed|STU-2024-001|BS Computer Science|ABC University|2024-06-15'),
    blockchainTxHash: '0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    status: 'ACTIVE',
    issuedBy: 'uni-1',
    issuedAt: new Date(now - 86400000 * 30).toISOString(),
  },
  {
    id: 'deg-2',
    studentName: 'Sara Khan',
    studentId: 'STU-2024-002',
    program: 'BS Software Engineering',
    university: 'ABC University',
    graduationDate: '2024-06-15',
    degreeHash: generateHash('Sara Khan|STU-2024-002|BS Software Engineering|ABC University|2024-06-15'),
    blockchainTxHash: '0xb2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    status: 'ACTIVE',
    issuedBy: 'uni-1',
    issuedAt: new Date(now - 86400000 * 25).toISOString(),
  },
  {
    id: 'deg-3',
    studentName: 'Ahmed Raza',
    studentId: 'STU-2024-003',
    program: 'BS Information Technology',
    university: 'XYZ University',
    graduationDate: '2024-07-20',
    degreeHash: generateHash('Ahmed Raza|STU-2024-003|BS Information Technology|XYZ University|2024-07-20'),
    blockchainTxHash: '0xc3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    status: 'ACTIVE',
    issuedBy: 'uni-2',
    issuedAt: new Date(now - 86400000 * 20).toISOString(),
  },
  {
    id: 'deg-4',
    studentName: 'Ali Ahmed',
    studentId: 'STU-2024-001',
    program: 'MS Data Science',
    university: 'XYZ University',
    graduationDate: '2024-12-20',
    degreeHash: generateHash('Ali Ahmed|STU-2024-001|MS Data Science|XYZ University|2024-12-20'),
    blockchainTxHash: '0xd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    status: 'ACTIVE',
    issuedBy: 'uni-2',
    issuedAt: new Date(now - 86400000 * 10).toISOString(),
  },
  {
    id: 'deg-5',
    studentName: 'Sara Khan',
    studentId: 'STU-2024-002',
    program: 'MS Artificial Intelligence',
    university: 'XYZ University',
    graduationDate: '2024-12-20',
    degreeHash: generateHash('Sara Khan|STU-2024-002|MS Artificial Intelligence|XYZ University|2024-12-20'),
    blockchainTxHash: '0xe5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    status: 'REVOKED',
    issuedBy: 'uni-2',
    issuedAt: new Date(now - 86400000 * 5).toISOString(),
  },
];

export const INITIAL_VERIFICATIONS: VerificationResult[] = [
  {
    id: 'ver-1',
    employer: 'TechCorp Ltd',
    degreeHash: INITIAL_DEGREES[0].degreeHash,
    result: 'VALID',
    timestamp: new Date(now - 86400000 * 15).toISOString(),
    studentName: 'Ali Ahmed',
    program: 'BS Computer Science',
    university: 'ABC University',
  },
  {
    id: 'ver-2',
    employer: 'FutureSoft Pvt Ltd',
    degreeHash: INITIAL_DEGREES[2].degreeHash,
    result: 'VALID',
    timestamp: new Date(now - 86400000 * 10).toISOString(),
    studentName: 'Ahmed Raza',
    program: 'BS Information Technology',
    university: 'XYZ University',
  },
  {
    id: 'ver-3',
    employer: 'TechCorp Ltd',
    degreeHash: INITIAL_DEGREES[4].degreeHash,
    result: 'REVOKED',
    timestamp: new Date(now - 86400000 * 3).toISOString(),
    studentName: 'Sara Khan',
    program: 'MS Artificial Intelligence',
    university: 'XYZ University',
  },
];

export const INITIAL_FRAUD_REPORTS: FraudReport[] = [
  {
    id: 'fraud-1',
    fileName: 'fake_degree_scan.pdf',
    reason: 'Missing university logo and official stamp',
    timestamp: new Date(now - 86400000 * 7).toISOString(),
    riskScore: 85,
    details: {
      logoDetected: false,
      stampDetected: false,
      signatureDetected: true,
      qrDetected: false,
    },
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', action: 'DEGREE_ISSUED', actor: 'ABC University', role: 'university', target: 'Ali Ahmed - BS Computer Science', timestamp: new Date(now - 86400000 * 30).toISOString(), txHash: INITIAL_DEGREES[0].blockchainTxHash },
  { id: 'log-2', action: 'DEGREE_ISSUED', actor: 'ABC University', role: 'university', target: 'Sara Khan - BS Software Engineering', timestamp: new Date(now - 86400000 * 25).toISOString(), txHash: INITIAL_DEGREES[1].blockchainTxHash },
  { id: 'log-3', action: 'DEGREE_ISSUED', actor: 'XYZ University', role: 'university', target: 'Ahmed Raza - BS Information Technology', timestamp: new Date(now - 86400000 * 20).toISOString(), txHash: INITIAL_DEGREES[2].blockchainTxHash },
  { id: 'log-4', action: 'DEGREE_VERIFIED', actor: 'TechCorp Ltd', role: 'employer', target: 'Ali Ahmed - BS Computer Science', timestamp: new Date(now - 86400000 * 15).toISOString() },
  { id: 'log-5', action: 'DEGREE_ISSUED', actor: 'XYZ University', role: 'university', target: 'Ali Ahmed - MS Data Science', timestamp: new Date(now - 86400000 * 10).toISOString(), txHash: INITIAL_DEGREES[3].blockchainTxHash },
  { id: 'log-6', action: 'DEGREE_VERIFIED', actor: 'FutureSoft Pvt Ltd', role: 'employer', target: 'Ahmed Raza - BS Information Technology', timestamp: new Date(now - 86400000 * 10).toISOString() },
  { id: 'log-7', action: 'FRAUD_DETECTED', actor: 'TechCorp Ltd', role: 'employer', target: 'fake_degree_scan.pdf', timestamp: new Date(now - 86400000 * 7).toISOString() },
  { id: 'log-8', action: 'DEGREE_ISSUED', actor: 'XYZ University', role: 'university', target: 'Sara Khan - MS Artificial Intelligence', timestamp: new Date(now - 86400000 * 5).toISOString(), txHash: INITIAL_DEGREES[4].blockchainTxHash },
  { id: 'log-9', action: 'DEGREE_REVOKED', actor: 'XYZ University', role: 'university', target: 'Sara Khan - MS Artificial Intelligence', timestamp: new Date(now - 86400000 * 4).toISOString(), txHash: '0xf6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1' },
  { id: 'log-10', action: 'DEGREE_VERIFIED', actor: 'TechCorp Ltd', role: 'employer', target: 'Sara Khan - MS Artificial Intelligence (REVOKED)', timestamp: new Date(now - 86400000 * 3).toISOString() },
];

export const INITIAL_TRANSACTIONS: BlockchainTransaction[] = [
  { hash: INITIAL_DEGREES[0].blockchainTxHash, from: USERS[1].walletAddress, to: '0xDegreeRegistry', action: 'issueDegree()', timestamp: INITIAL_DEGREES[0].issuedAt, blockNumber: 1001, gasUsed: 125000 },
  { hash: INITIAL_DEGREES[1].blockchainTxHash, from: USERS[1].walletAddress, to: '0xDegreeRegistry', action: 'issueDegree()', timestamp: INITIAL_DEGREES[1].issuedAt, blockNumber: 1002, gasUsed: 125000 },
  { hash: INITIAL_DEGREES[2].blockchainTxHash, from: USERS[2].walletAddress, to: '0xDegreeRegistry', action: 'issueDegree()', timestamp: INITIAL_DEGREES[2].issuedAt, blockNumber: 1003, gasUsed: 125000 },
  { hash: INITIAL_DEGREES[3].blockchainTxHash, from: USERS[2].walletAddress, to: '0xDegreeRegistry', action: 'issueDegree()', timestamp: INITIAL_DEGREES[3].issuedAt, blockNumber: 1004, gasUsed: 125000 },
  { hash: INITIAL_DEGREES[4].blockchainTxHash, from: USERS[2].walletAddress, to: '0xDegreeRegistry', action: 'issueDegree()', timestamp: INITIAL_DEGREES[4].issuedAt, blockNumber: 1005, gasUsed: 125000 },
  { hash: '0xf6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1', from: USERS[2].walletAddress, to: '0xDegreeRegistry', action: 'revokeDegree()', timestamp: new Date(now - 86400000 * 4).toISOString(), blockNumber: 1006, gasUsed: 65000 },
];
