import { ethers } from 'ethers';
import { getReadContract, getWriteContract } from './ethereumBlockchain';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DegreeIssuanceInput {
  degreeId: string;
  studentName: string;
  registrationNumber: string;
  program: string;
  department: string;
  admissionYear: number;
  graduationYear: number;
  cgpaX100: number; // e.g., 3.75 GPA → pass 375
}

export interface IssuanceResult {
  txHash: string;
  blockNumber: number;
  timestamp: number; // Unix seconds
  degreeHash: string; // SHA-256 hex
}

export interface DegreeRecord {
  degreeId: string;
  degreeHash: string;
  studentName: string;
  registrationNumber: string;
  program: string;
  department: string;
  admissionYear: number;
  graduationYear: number;
  cgpaX100: number;
  issuer: string;       // Ethereum address of university admin
  issuedAt: number;     // Unix timestamp
  isRevoked: boolean;
}

export interface VerificationResult {
  valid: boolean;
  revoked: boolean;
  degreeId?: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic SHA-256 hash of degree data using Web Crypto API.
 */
export async function computeDegreeHash(input: DegreeIssuanceInput): Promise<string> {
  const normalized = JSON.stringify({
    degreeId:           input.degreeId.trim().toLowerCase(),
    studentName:        input.studentName.trim().toLowerCase(),
    registrationNumber: input.registrationNumber.trim().toUpperCase(),
    program:            input.program.trim().toLowerCase(),
    department:         input.department.trim().toLowerCase(),
    admissionYear:      input.admissionYear,
    graduationYear:     input.graduationYear,
    cgpaX100:           input.cgpaX100,
  });

  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE METHODS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes to blockchain, returns tx details for state persistence.
 */
export async function issueDegreeOnChain(
  input: DegreeIssuanceInput
): Promise<IssuanceResult> {
  const degreeHash = await computeDegreeHash(input);
  const contract = await getWriteContract();

  function issueDegree(
  string memory _degreeId,           // 1
  string memory _studentName,        // 2
  string memory _registrationNumber, // 3
  string memory _department,         // 4
  string memory _program,            // 5
  string memory _cgpa,               // 6  ← string, not number
  string memory _graduationYear,     // 7  ← string, not number
  string memory _degreeHash          // 8  ← hash goes LAST
) public onlyOwner

  const receipt = await tx.wait(1);
  const provider = contract.runner?.provider as ethers.JsonRpcProvider;
  const block = await provider.getBlock(receipt.blockNumber);
  const timestamp = block?.timestamp ?? Math.floor(Date.now() / 1000);

  return {
    txHash:      receipt.hash,
    blockNumber: receipt.blockNumber,
    timestamp,
    degreeHash,
  };
}

/**
 * Read canonical degree record from blockchain by degreeId.
 */
export async function getDegreeOnChain(degreeId: string): Promise<DegreeRecord> {
  const contract = getReadContract();
  const result = await contract.getDegree(degreeId);

  return {
    degreeId:           result[0],
    degreeHash:         result[1],
    studentName:        result[2],
    registrationNumber: result[3],
    program:            result[4],
    department:         result[5],
    admissionYear:      Number(result[6]),
    graduationYear:     Number(result[7]),
    cgpaX100:           Number(result[8]),
    issuer:             result[9],
    issuedAt:           Number(result[10]),
    isRevoked:          result[11],
  };
}

/**
 * Returns VALID / REVOKED / INVALID without exposing full degree data.
 */
export async function verifyByHashOnChain(
  degreeHash: string
): Promise<VerificationResult> {
  try {
    const contract = getReadContract();
    const [found, revoked, degreeId] = await contract.verifyByHash(degreeHash);

    if (!found) {
      return { valid: false, revoked: false, message: 'INVALID — No degree found with this hash.' };
    }
    if (revoked) {
      return { valid: false, revoked: true, degreeId, message: 'REVOKED — Degree revoked by university.' };
    }
    return { valid: true, revoked: false, degreeId, message: 'VALID — Degree verified on blockchain.' };
  } catch (err: any) {
    return { valid: false, revoked: false, message: `Verification error: ${err.message}` };
  }
}

/**
 * Marks degree as revoked on chain.
 */
export async function revokeDegreeOnChain(degreeId: string): Promise<{
  txHash: string;
  blockNumber: number;
}> {
  const contract = await getWriteContract();
  const tx = await contract.revokeDegree(degreeId);
  const receipt = await tx.wait(1);
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}