import CryptoJS from 'crypto-js';
import { DegreeApplication } from '../types';

export interface LocalAttestation {
  txHash: string;
  degreeHash: string;
  issuerAddress: string;
  blockNumber: number;
  issuedAt: string;
}

function sha256Hex(value: string): string {
  return `0x${CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex)}`;
}

function canonicalDegreePayload(degree: DegreeApplication, degreeId: string, issuedAt: string) {
  return {
    degreeId,
    studentId: degree.studentId,
    studentName: degree.studentName,
    registrationNumber: degree.registrationNumber,
    department: degree.department,
    program: degree.program,
    degreeTitle: degree.degreeTitle,
    cgpa: degree.cgpa,
    admissionYear: degree.admissionYear,
    graduationYear: degree.graduationYear,
    issuedAt,
  };
}

export function createDegreeId(degree: DegreeApplication): string {
  const departmentCode = degree.department
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase())
    .join('')
    .slice(0, 4) || 'DEG';

  return `IQRA-${departmentCode}-${degree.graduationYear}-${degree.registrationNumber}`;
}

export function createLocalAttestation(degree: DegreeApplication, issuedAt = new Date().toISOString()): LocalAttestation {
  const degreeId = degree.degreeId || createDegreeId(degree);
  const payload = canonicalDegreePayload(degree, degreeId, issuedAt);
  const degreeHash = sha256Hex(JSON.stringify(payload));
  const txHash = sha256Hex(JSON.stringify({ degreeHash, degreeId, issuedAt, action: 'ISSUE_DEGREE' }));
  const blockSeed = CryptoJS.SHA256(`${txHash}:block`).toString(CryptoJS.enc.Hex).slice(0, 8);
  const issuerSeed = CryptoJS.SHA256('iqra-university-degree-issuer').toString(CryptoJS.enc.Hex).slice(0, 40);

  return {
    txHash,
    degreeHash,
    issuerAddress: `0x${issuerSeed}`,
    blockNumber: 15000 + (parseInt(blockSeed, 16) % 50000),
    issuedAt,
  };
}
