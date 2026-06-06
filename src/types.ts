export type UserRole = 'student' | 'admin' | 'employer';

export type VerificationStatus = 'pending' | 'documents_uploaded' | 'ocr_verified' | 'face_verified' | 'approved' | 'rejected';

export type DegreeStatus = 'pending' | 'processing' | 'approved' | 'issued' | 'revoked';

export type FraudLevel = 'safe' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
  registrationNumber: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  fatherName?: string;
  cnicNumber?: string;
  department?: string;
  program?: string;
  admissionYear?: number;
  graduationYear?: number;
  cgpa?: number;
  profilePhoto?: string;
  documents?: UploadedDocument[];
  createdAt: string;
}

export interface UploadedDocument {
  id: string;
  type: 'cnic' | 'marksheet' | 'certificate' | 'academic_record';
  fileName: string;
  uploadedAt: string;
  ocrStatus: 'pending' | 'processing' | 'verified' | 'failed';
  yoloStatus: 'pending' | 'processing' | 'valid' | 'suspicious' | 'fraudulent';
  extractedData?: Record<string, string>;
}

export interface DegreeApplication {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  department: string;
  program: string;
  degreeTitle: string;
  cgpa: number;
  admissionYear: number;
  graduationYear: number;
  status: DegreeStatus;
  appliedAt: string;
  approvedAt?: string;
  blockchainHash?: string;
  degreeId?: string;
  qrCodeData?: string;
  fraudScore: number;
}

export interface BlockchainTransaction {
  id: string;
  txHash: string;
  degreeId: string;
  studentRegNo: string;
  degreeHash: string;
  timestamp: string;
  issuerAddress: string;
  blockNumber: number;
  gasUsed: number;
  status: 'confirmed' | 'pending' | 'failed';
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
  category: 'auth' | 'verification' | 'degree' | 'blockchain' | 'fraud' | 'admin';
}

export interface FraudReport {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  severity: FraudLevel;
  description: string;
  timestamp: string;
  resolved: boolean;
}

export interface VerificationRequest {
  id: string;
  degreeId: string;
  verifierEmail: string;
  verifiedAt: string;
  result: 'valid' | 'invalid' | 'revoked';
  blockchainVerified: boolean;
}
