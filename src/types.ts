export type Role = 'admin' | 'university' | 'student' | 'employer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  walletAddress: string;
  organization?: string;
}

export type DegreeStatus = 'ACTIVE' | 'REVOKED';

export interface Degree {
  id: string;
  studentName: string;
  studentId: string;
  program: string;
  university: string;
  graduationDate: string;
  degreeHash: string;
  blockchainTxHash: string;
  status: DegreeStatus;
  issuedBy: string;
  issuedAt: string;
  qrCode?: string;
}

export interface VerificationResult {
  id: string;
  employer: string;
  degreeHash: string;
  result: 'VALID' | 'INVALID' | 'REVOKED';
  timestamp: string;
  studentName?: string;
  program?: string;
  university?: string;
}

export interface FraudReport {
  id: string;
  fileName: string;
  reason: string;
  timestamp: string;
  riskScore: number;
  details: {
    logoDetected: boolean;
    stampDetected: boolean;
    signatureDetected: boolean;
    qrDetected: boolean;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  role: Role;
  target: string;
  timestamp: string;
  txHash?: string;
}

export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  action: string;
  timestamp: string;
  blockNumber: number;
  gasUsed: number;
}

export interface OCRResult {
  studentName: string;
  studentId: string;
  program: string;
  university: string;
  graduationDate: string;
  confidence: number;
  extractedHash: string;
}

export interface YOLODetection {
  logoDetected: boolean;
  logoConfidence: number;
  stampDetected: boolean;
  stampConfidence: number;
  signatureDetected: boolean;
  signatureConfidence: number;
  qrDetected: boolean;
  qrConfidence: number;
  overallFraudScore: number;
  verdict: 'GENUINE' | 'SUSPICIOUS' | 'FRAUDULENT';
}
