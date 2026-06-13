import { ethers } from 'ethers';
import DegreeRegistryABI from '../../artifacts/contracts/DegreeRegistry.sol/DegreeRegistry.json';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DegreeIssuanceInput {
  degreeId: string;
  studentName: string;
  registrationNumber: string;
  program: string;
  department: string;
  admissionYear: number;
  graduationYear: number;
  cgpaX100: number; // e.g., 3.75 GPA → 375
}

export interface IssuanceResult {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  degreeHash: string;
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
  issuer: string;
  issuedAt: number;
  isRevoked: boolean;
}

export interface VerificationResult {
  valid: boolean;
  revoked: boolean;
  degreeId?: string;
  message: string;
}

// ── Provider & Signer ──────────────────────────────────────────────────────

/**
 * Returns a read-only provider connected to local Ganache.
 */
export function getProvider(): ethers.JsonRpcProvider {
  const rpc = import.meta.env.VITE_GANACHE_RPC || 'http://127.0.0.1:7545';
  return new ethers.JsonRpcProvider(rpc);
}

/**
 * Returns a signer from MetaMask.
 * Used for write operations like issueDegree or revokeDegree.
 */
export async function getSigner(): Promise<ethers.Signer> {
  if (!window.ethereum) {
    throw new Error(
      'MetaMask not detected. Please install MetaMask and connect it to Ganache.'
    );
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const network = await provider.getNetwork();
  const expectedChainId = BigInt(import.meta.env.VITE_CHAIN_ID || '1337');

  if (network.chainId !== expectedChainId) {
    throw new Error(
      `Wrong network. MetaMask is on chain ${network.chainId}. ` +
      `Please switch to Ganache (chain ID ${expectedChainId}).`
    );
  }

  return signer;
}

// ── Contract Instances ─────────────────────────────────────────────────────

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

/**
 * Read-only contract instance.
 */
export function getReadContract(): ethers.Contract {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, DegreeRegistryABI.abi, provider);
}

/**
 * Write-enabled contract instance.
 */
export async function getWriteContract(): Promise<ethers.Contract> {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, DegreeRegistryABI.abi, signer);
}

// ── Hashing Utility ────────────────────────────────────────────────────────

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

// ── Business Methods ───────────────────────────────────────────────────────

/**
 * Writes degree hash and student metadata to blockchain.
 */
export async function issueDegreeOnChain(
  input: DegreeIssuanceInput
): Promise<IssuanceResult> {
  const degreeHash = await computeDegreeHash(input);
  const contract = await getWriteContract();

  const tx = await contract.issueDegree(
    input.degreeId,
    degreeHash,
    input.studentName,
    input.registrationNumber,
    input.program,
    input.department,
    input.admissionYear,
    input.graduationYear,
    input.cgpaX100
  );

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
 * Verifies a degree hash on the blockchain.
 * Returns VALID / REVOKED / INVALID.
 */
export async function verifyDegreeOnChain(
  degreeHash: string
): Promise<VerificationResult> {
  try {
    const contract = getReadContract();
    const [found, revoked, degreeId] = await contract.verifyByHash(degreeHash);

    if (!found) {
      return {
        valid: false,
        revoked: false,
        message: 'INVALID — No record found on the blockchain.',
      };
    }

    if (revoked) {
      return {
        valid: false,
        revoked: true,
        degreeId,
        message: 'REVOKED — This degree has been revoked by the university.',
      };
    }

    return {
      valid: true,
      revoked: false,
      degreeId,
      message: 'VALID — Degree verified on blockchain.',
    };
  } catch (err: any) {
    return { valid: false, revoked: false, message: `Verification error: ${err.message}` };
  }
}

/**
 * Administrative revocation.
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

/**
 * Fetch full record for detail views.
 */
export async function getDegreeOnChain(degreeId: string): Promise<DegreeRecord> {
  const contract = getReadContract();
  const result = await contract.getDegree(degreeId);

  return {
    degreeId: result[0], degreeHash: result[1], studentName: result[2],
    registrationNumber: result[3], program: result[4], department: result[5],
    admissionYear: Number(result[6]), graduationYear: Number(result[7]),
    cgpaX100: Number(result[8]), issuer: result[9], issuedAt: Number(result[10]),
    isRevoked: result[11],
  };
}

// ── Network Health Check ────────────────────────────────────────────────────

/**
 * Confirms Ganache is reachable.
 */
export async function checkBlockchainConnection(): Promise<{
  connected: boolean;
  blockNumber?: number;
  error?: string;
}> {
  try {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    return { connected: true, blockNumber };
  } catch (err: any) {
    return {
      connected: false,
      error: 'Cannot reach Ganache. Make sure it is running on port 7545.',
    };
  }
}

export { ethers };
