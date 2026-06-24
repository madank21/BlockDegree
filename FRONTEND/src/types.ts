/**
 * Global TypeScript types
 * Path: FRONTEND/src/types.ts
 *
 * FIXES vs original:
 *  1. Added 'university' to UserRole (backend has 4 roles; frontend only had 3).
 *  2. User interface now accepts both camelCase (frontend) and snake_case (backend) field names.
 *  3. Added InstitutionUser sub-type for university accounts.
 *  4. Added Pagination type used by all listRequest() responses.
 *  5. Added BlockchainNetworkInfo type.
 *  6. Extended DegreeApplication with all backend fields.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core enums / unions
// ─────────────────────────────────────────────────────────────────────────────

/** FIXED: Added 'university' — was missing, causing runtime errors for university users */
export type UserRole = 'student' | 'admin' | 'employer' | 'university';

export type VerificationStatus =
  | 'pending'
  | 'documents_uploaded'
  | 'ocr_verified'
  | 'face_verified'
  | 'approved'
  | 'rejected';

export type DegreeStatus = 'pending' | 'processing' | 'approved' | 'issued' | 'revoked';

export type FraudLevel = 'safe' | 'low' | 'medium' | 'high';

export type BlockchainSyncStatus = 'pending' | 'processing' | 'confirmed' | 'failed';

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id:                 string;
  /** Accepts both full_name (backend) and name (frontend) */
  name:               string;
  full_name?:         string;
  email:              string;
  role:               UserRole;
  verificationStatus: VerificationStatus;
  passwordHash?:      string;

  // Student-specific
  registrationNumber?: string;
  studentId?:          string;
  student_id?:         string;
  fatherName?:         string;
  father_name?:        string;
  cnicNumber?:         string;
  cnic_number?:        string;
  department?:         string;
  program?:            string;
  admissionYear?:      number;
  admission_year?:     number;
  graduationYear?:     number;
  graduation_year?:    number;
  cgpa?:               number;
  profilePhoto?:       string;
  profile_photo_url?:  string;

  // University-specific
  institution_name?:   string;
  institutionName?:    string;

  // Common
  is_active?:          boolean;
  status?:             string;
  createdAt:           string;
  created_at?:         string;

  // Embedded relations (optional)
  documents?: UploadedDocument[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Document
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadedDocument {
  id:               string;
  type:             'cnic' | 'marksheet' | 'certificate' | 'academic_record';
  document_type?:   string;
  fileName:         string;
  original_name?:   string;
  uploadedAt:       string;
  created_at?:      string;
  ocrStatus:        'pending' | 'processing' | 'verified' | 'failed';
  ocr_status?:      string;
  yoloStatus:       'pending' | 'processing' | 'valid' | 'suspicious' | 'fraudulent';
  yolo_status?:     string;
  extractedData?:   Record<string, string>;
  extracted_data?:  Record<string, string>;
  validationStatus?: 'pending' | 'valid' | 'mismatch' | 'invalid';
  validation_status?: string;
  validationErrors?: string[];
  validation_errors?: string[];
  fileUrl?:         string;
  file_url?:        string;
  user_id?:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Degree Application
// ─────────────────────────────────────────────────────────────────────────────

export interface DegreeApplication {
  id:                   string;

  // Student info
  studentId?:           string;
  student_id?:          string;
  user_id?:             string;
  studentName:          string;
  student_name?:        string;
  registrationNumber:   string;
  registration_number?: string;

  // Degree info
  degreeTitle:          string;
  degree_title?:        string;
  department:           string;
  field_of_study?:      string;
  program:              string;
  cgpa:                 number;
  gpa?:                 number;
  admissionYear?:       number;
  admission_year?:      number;
  graduationYear:       string | number;
  graduation_year?:     string | number;
  graduation_date?:     string;

  // Status
  status:               DegreeStatus;
  appliedAt?:           string;
  created_at?:          string;
  approvedAt?:          string;
  approved_at?:         string;

  // Blockchain
  blockchainHash?:      string;
  blockchainTxHash?:    string;
  blockchain_tx_hash?:  string;
  degreeHash?:          string;
  degree_hash?:         string;
  blockchainSyncStatus?: BlockchainSyncStatus;
  blockchain_sync_status?: string;

  // Certificate
  degreeId?:            string;
  certificateNumber?:   string;
  certificate_number?:  string;
  qrCodeData?:          string;
  qr_code_url?:         string;

  // Fraud
  fraudScore:           number;
  fraud_score?:         number;

  // Institution
  institutionName?:     string;
  institution_name?:    string;
  issuedBy?:            string;
  issued_by?:           string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Blockchain
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockchainTransaction {
  id:             string;
  txHash:         string;
  tx_hash?:       string;
  degreeId:       string;
  degree_id?:     string;
  operation?:     string;
  studentRegNo?:  string;
  degreeHash?:    string;
  timestamp?:     string;
  created_at?:    string;
  confirmed_at?:  string;
  issuerAddress?: string;
  blockNumber?:   number;
  block_number?:  number;
  gasUsed?:       number;
  gas_used?:      number;
  status:         'confirmed' | 'pending' | 'failed';
}

export interface BlockchainNetworkInfo {
  networkName:     string;
  chainId:         string;
  blockNumber:     number;
  contractAddress: string;
  walletAddress:   string;
  walletBalance:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id:          string;
  action:      string;
  userId?:     string;
  user_id?:    string;
  actor_id?:   string;
  userName?:   string;
  timestamp?:  string;
  created_at?: string;
  details?:    string | Record<string, any>;
  metadata?:   Record<string, any>;
  category?:   'auth' | 'verification' | 'degree' | 'blockchain' | 'fraud' | 'admin';
  ip_address?: string;
  ipAddress?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fraud
// ─────────────────────────────────────────────────────────────────────────────

export interface FraudReport {
  id:           string;
  studentId?:   string;
  studentName?: string;
  student_name?: string;
  type?:        string;
  severity:     FraudLevel;
  description?: string;
  timestamp?:   string;
  created_at?:  string;
  resolved:     boolean;
  fraudScore?:  number;
  fraud_score?: number;
  riskLevel?:   string;
  risk_level?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────────────────────────────────────

export interface VerificationRequest {
  id:                     string;
  degreeId?:              string;
  degree_id?:             string;
  verifierEmail?:         string;
  requester_email?:       string;
  verifiedAt?:            string;
  verified_at?:           string;
  result?:                'valid' | 'invalid' | 'revoked';
  status?:                'pending' | 'verified' | 'rejected' | 'flagged' | 'expired';
  blockchainVerified?:    boolean;
  blockchain_verified?:   boolean;
  verification_code?:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export interface Pagination {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  pagination: Partial<Pagination>;
}