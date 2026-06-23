// FRONTEND/src/types.ts
// ─────────────────────────────────────────────────────────────────────────────
// FIXES:
//   - Added 'university' to UserRole (was missing; broke university-role login)
//   - Added university-specific fields to User interface
//   - Renamed blockchainHash → blockchainTxHash in DegreeApplication to match backend
//   - Added qrCode field (backend returns qrCode, not qrUrl)
// ─────────────────────────────────────────────────────────────────────────────

// FIX: 'university' added — previously missing, caused role-check failures
export type UserRole = 'student' | 'admin' | 'employer' | 'university';

export type VerificationStatus =
  | 'pending'
  | 'documents_uploaded'
  | 'ocr_verified'
  | 'face_verified'
  | 'approved'
  | 'rejected';

export type DegreeStatus = 'pending' | 'processing' | 'approved' | 'issued' | 'revoked' | 'suspended';

export type FraudLevel = 'safe' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  registrationNumber?: string;
  studentId?: string;
  role: UserRole;
  verificationStatus?: VerificationStatus;
  isActive?: boolean;
  emailVerified?: boolean;
  avatarUrl?: string;

  // Student fields
  fatherName?: string;
  cnicNumber?: string;
  department?: string;
  program?: string;
  admissionYear?: number;
  graduationYear?: number;
  cgpa?: number;
  profilePhoto?: string;

  // University / Institution fields (FIX: added)
  institutionId?: string;
  institutionName?: string;
  walletAddress?: string;

  // Face verification
  faceDescriptorHash?: string;
  faceRegisteredAt?: string;

  documents?: UploadedDocument[];
  metadata?: Record<string, unknown>;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UploadedDocument {
  id: string;
  type: 'cnic' | 'marksheet' | 'certificate' | 'academic_record' | 'degree' | 'other';
  fileName: string;
  originalName?: string;
  uploadedAt: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  fileHash?: string;

  // Analysis statuses
  ocrStatus: 'pending' | 'processing' | 'verified' | 'failed' | 'completed';
  yoloStatus: 'pending' | 'processing' | 'valid' | 'suspicious' | 'fraudulent';
  validationStatus?: 'pending' | 'valid' | 'mismatch' | 'invalid';

  // Extracted data
  extractedData?: Record<string, string>;
  ocrText?: string;
  ocrConfidence?: number;
  yoloDetections?: unknown[];
  yoloValid?: boolean;
  yoloConfidence?: number;
  validationErrors?: string[];

  // Fraud
  fraudScore?: number;
  isVerified?: boolean;
  verificationNotes?: string;

  // Degree link
  degreeId?: string;
  userId?: string;
}

export interface DegreeApplication {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  registrationNumber?: string;
  department?: string;
  program?: string;
  degreeTitle: string;
  fieldOfStudy?: string;
  gpa?: number;
  cgpa?: number;
  admissionYear?: number;
  graduationYear?: number;
  graduationDate?: string;
  honors?: string;

  // Institution
  institutionId?: string;
  institutionName?: string;
  issuedBy?: string;

  status: DegreeStatus;
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;

  // Cryptographic / blockchain
  degreeHash?: string;
  // FIX: renamed from blockchainHash to blockchainTxHash (matches backend DTO)
  blockchainTxHash?: string;
  blockchainBlockNumber?: number;
  blockchainTimestamp?: number;
  blockchainSyncStatus?: 'queued' | 'processing' | 'success' | 'failed';

  // QR & certificate
  certificateNumber?: string;
  // FIX: backend returns `qrCode` (not `qrUrl`)
  qrCode?: string;
  qrCodeUrl?: string;
  qrCodeData?: string;  // kept for backwards compat

  // Document / IPFS
  documentHash?: string;
  documentUrl?: string;
  ipfsCid?: string;
  ipfsGatewayUrl?: string;

  // Revocation
  revocationReason?: string;
  revokedAt?: string;
  revocationTxHash?: string;

  fraudScore?: number;
  metadata?: Record<string, unknown>;
}

export interface BlockchainTransaction {
  id: string;
  txHash: string;
  degreeId?: string;
  studentRegNo?: string;
  degreeHash?: string;
  timestamp: string;
  issuerAddress?: string;
  blockNumber?: number;
  gasUsed?: number;
  operation: 'issue' | 'revoke' | 'verify';
  status: 'confirmed' | 'pending' | 'failed';
  confirmedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  userName?: string;
  actorId?: string;
  actorRole?: string;
  timestamp?: string;
  createdAt?: string;
  details?: string | Record<string, unknown>;
  category?: 'auth' | 'verification' | 'degree' | 'blockchain' | 'fraud' | 'admin';
  resourceType?: string;
  resourceId?: string;
}

export interface FraudReport {
  id: string;
  studentId?: string;
  studentName?: string;
  type?: string;
  riskLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  // Legacy alias kept for existing components
  severity?: FraudLevel;
  description?: string;
  fileName?: string;
  fraudScore?: number;
  isFraudulent?: boolean;
  timestamp?: string;
  createdAt?: string;
  resolved?: boolean;
  resolvedAt?: string;
  degreeId?: string;
  findings?: string[];
}

export interface VerificationRequest {
  id: string;
  degreeId?: string;
  computedHash?: string;
  verifierEmail?: string;
  requesterEmail?: string;
  requesterOrganization?: string;
  verifiedAt?: string;
  result: 'valid' | 'invalid' | 'revoked';
  blockchainVerified?: boolean;
  verificationCode?: string;
  status?: 'pending' | 'verified' | 'rejected' | 'expired' | 'flagged';
}

// ── Page navigation helper (used across dashboards) ──────────────────────────
export type NavigateFn = (page: string) => void;