//
// FRONTEND/src/types.ts
//
// FIXES APPLIED:
//   [1] 'university' added to UserRole union  (was missing — broke login + role-checks)
//   [2] User: registrationNumber, verificationStatus, createdAt made optional
//       (backend does not guarantee these for all roles — employer/admin have no regNo)
//   [3] User: added university-specific fields (institutionId, institutionName, walletAddress)
//   [4] User: added emailVerified, isActive, lastLogin, avatarUrl, studentId
//   [5] UploadedDocument: added fileSize, mimeType, fileHash, degreeId, userId,
//       fraudScore, isVerified, verificationNotes, ocrConfidence, ocrText,
//       yoloConfidence, yoloDetections, yoloValid
//   [6] DegreeApplication: blockchainHash renamed → blockchainTxHash
//       (matches backend DTO field; old alias kept for safety)
//   [7] DegreeApplication: qrCode field added (backend returns qrCode not qrUrl)
//   [8] DegreeApplication: many fields made optional to match real API shape
//   [9] BlockchainTransaction: operation field added (required by backend)
//  [10] AuditLog: fields made optional, actorId/actorRole/category made optional
//  [11] FraudReport: riskLevel added as alternate (backend uses riskLevel not severity)
//  [12] VerificationRequest: added richer fields matching backend response
//

// ─────────────────────────────────────────────────────────────────────────────
// Primitive unions
// ─────────────────────────────────────────────────────────────────────────────

// [FIX 1] 'university' was missing — caused role-check failures on login
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

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;

  // [FIX 2] Made optional — not present on employer/admin accounts
  registrationNumber?: string;
  verificationStatus?: VerificationStatus;
  createdAt?: string;

  // [FIX 4] Common optional fields
  passwordHash?:    string;
  studentId?:       string;
  isActive?:        boolean;
  emailVerified?:   boolean;
  avatarUrl?:       string;
  lastLogin?:       string;
  updatedAt?:       string;

  // Student-specific
  fatherName?:    string;
  cnicNumber?:    string;
  department?:    string;
  program?:       string;
  admissionYear?: number;
  graduationYear?: number;
  cgpa?:          number;
  profilePhoto?:  string;

  // Face verification
  faceDescriptorHash?: string;
  faceRegisteredAt?:   string;

  // [FIX 3] University-specific fields
  institutionId?:   string;
  institutionName?: string;
  walletAddress?:   string;

  documents?: UploadedDocument[];
  metadata?:  Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// UploadedDocument
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadedDocument {
  id: string;
  // [FIX 5] Added 'degree' and 'other' — backend uses these types
  type: 'cnic' | 'marksheet' | 'certificate' | 'academic_record' | 'degree' | 'other';
  fileName: string;
  uploadedAt: string;

  // Analysis statuses
  ocrStatus:        'pending' | 'processing' | 'verified' | 'failed' | 'completed';
  yoloStatus:       'pending' | 'processing' | 'valid' | 'suspicious' | 'fraudulent';
  validationStatus?: 'pending' | 'valid' | 'mismatch' | 'invalid';
  validationErrors?: string[];

  // [FIX 5] Additional fields returned by backend
  originalName?:    string;
  fileUrl?:         string;
  fileSize?:        number;
  mimeType?:        string;
  fileHash?:        string;
  degreeId?:        string;
  userId?:          string;

  // OCR data
  extractedData?:   Record<string, string>;
  ocrText?:         string;
  ocrConfidence?:   number;

  // YOLO data
  yoloDetections?:  unknown[];
  yoloValid?:       boolean;
  yoloConfidence?:  number;

  // Fraud
  fraudScore?:        number;
  isVerified?:        boolean;
  verificationNotes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DegreeApplication
// ─────────────────────────────────────────────────────────────────────────────

export interface DegreeApplication {
  id: string;
  studentId: string;
  studentName: string;
  status: DegreeStatus;

  // [FIX 8] All detail fields made optional — backend may omit them depending on status
  registrationNumber?: string;
  department?:         string;
  program?:            string;
  degreeTitle?:        string;
  fieldOfStudy?:       string;
  cgpa?:               number;
  gpa?:                number;
  admissionYear?:      number;
  graduationYear?:     number;
  graduationDate?:     string;
  honors?:             string;
  appliedAt?:          string;
  createdAt?:          string;
  updatedAt?:          string;
  approvedAt?:         string;

  // Institution
  institutionId?:   string;
  institutionName?: string;
  issuedBy?:        string;

  // Cryptographic / blockchain
  degreeHash?:          string;
  // [FIX 6] blockchainHash → blockchainTxHash (matches backend DTO)
  blockchainTxHash?:    string;
  blockchainHash?:      string;  // kept as alias for backward-compat
  blockchainBlockNumber?: number;
  blockchainTimestamp?:   number;
  blockchainSyncStatus?:  'queued' | 'processing' | 'success' | 'failed';

  // QR & certificate
  certificateNumber?: string;
  // [FIX 7] Backend returns qrCode (not qrUrl)
  qrCode?:     string;
  qrCodeUrl?:  string;  // kept as alias
  qrCodeData?: string;  // kept for backward-compat

  // IPFS
  documentHash?:    string;
  documentUrl?:     string;
  ipfsCid?:         string;
  ipfsGatewayUrl?:  string;

  // Revocation
  revocationReason?: string;
  revokedAt?:        string;
  revocationTxHash?: string;

  fraudScore?: number;
  metadata?:   Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// BlockchainTransaction
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockchainTransaction {
  id: string;
  txHash: string;
  status: 'confirmed' | 'pending' | 'failed';

  // [FIX 9] operation is required by DB schema (NOT NULL)
  operation: 'issue' | 'revoke' | 'verify';

  degreeId?:      string;
  studentRegNo?:  string;
  degreeHash?:    string;
  timestamp?:     string;
  issuerAddress?: string;
  blockNumber?:   number;
  gasUsed?:       number;
  confirmedAt?:   string;
  tokenId?:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditLog
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  action: string;

  // [FIX 10] Optional — not always present
  userId?:       string;
  userName?:     string;
  actorId?:      string;
  actorRole?:    string;
  timestamp?:    string;
  createdAt?:    string;
  details?:      string | Record<string, unknown>;
  category?:     'auth' | 'verification' | 'degree' | 'blockchain' | 'fraud' | 'admin';
  resourceType?: string;
  resourceId?:   string;
  ipAddress?:    string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FraudReport
// ─────────────────────────────────────────────────────────────────────────────

export interface FraudReport {
  id: string;

  // [FIX 11] Backend uses both riskLevel (new) and severity (old) — support both
  riskLevel?: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity?:  FraudLevel;  // kept for backward-compat with older FraudDetection code

  studentId?:   string;
  studentName?: string;
  type?:        string;
  description?: string;
  timestamp?:   string;
  createdAt?:   string;
  resolved?:    boolean;
  resolvedAt?:  string;
  degreeId?:    string;
  fraudScore?:  number;
  findings?:    string[];
  isFraudulent?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// VerificationRequest
// ─────────────────────────────────────────────────────────────────────────────

export interface VerificationRequest {
  id: string;
  result: 'valid' | 'invalid' | 'revoked';

  // [FIX 12] Made optional / added missing fields
  degreeId?:              string;
  verifierEmail?:         string;
  requesterEmail?:        string;
  requesterOrganization?: string;
  verifiedAt?:            string;
  blockchainVerified?:    boolean;
  computedHash?:          string;
  verificationCode?:      string;
  status?:                'pending' | 'verified' | 'rejected' | 'expired' | 'flagged';
  fraudCheckPassed?:      boolean;
  fraudScore?:            number;
}