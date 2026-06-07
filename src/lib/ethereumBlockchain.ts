import { ethers } from 'ethers';
import { DegreeApplication } from '../types';

// Smart Contract ABI (from your compiled contract)
const DEGREE_REGISTRY_ABI = [
  'function issueDegree(string degreeId, bytes32 degreeHash) external',
  'function verifyDegree(string degreeId) external view returns (bool, bytes32, uint256)',
  'function revokeDegree(string degreeId) external',
  'event DegreeIssued(string indexed degreeId, bytes32 degreeHash, uint256 timestamp)',
  'event DegreeRevoked(string indexed degreeId, uint256 timestamp)',
];

/**
 * Connect to user's Web3 wallet (MetaMask, etc.)
 */
export async function connectWallet(): Promise<{
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
  address: string;
}> {
  if (!window.ethereum) {
    throw new Error('MetaMask or similar Web3 wallet not found. Please install one.');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = accounts[0];

    return { provider, signer, address };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected wallet connection');
    }
    throw error;
  }
}

/**
 * Get the currently connected wallet address
 */
export async function getConnectedAddress(): Promise<string | null> {
  if (!window.ethereum) return null;

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    return accounts[0] || null;
  } catch {
    return null;
  }
}

/**
 * Switch to Sepolia testnet
 */
export async function switchToSepolia(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('Web3 wallet not found');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
    });
  } catch (error: any) {
    if (error.code === 4902) {
      // Chain not added, add it
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0xaa36a7',
            chainName: 'Sepolia',
            rpcUrls: ['https://sepolia.infura.io/v3/' + import.meta.env.VITE_INFURA_KEY],
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

/**
 * Hash degree data using Keccak256 (Ethereum standard)
 */
export function hashDegreeData(data: Record<string, any>): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['string'], [JSON.stringify(data)]);
  return ethers.keccak256(encoded);
}

/**
 * Issue a degree on the Ethereum blockchain
 */
export async function issueDegreeOnChain(
  degree: DegreeApplication,
  degreeId: string,
  contractAddress: string
): Promise<{
  txHash: string;
  blockNumber: number;
  degreeHash: string;
  issuedAt: string;
}> {
  await switchToSepolia();

  const { signer } = await connectWallet();
  const contract = new ethers.Contract(contractAddress, DEGREE_REGISTRY_ABI, signer);

  // Create degree payload and hash
  const payload = {
    degreeId,
    studentId: degree.studentId,
    studentName: degree.studentName,
    registrationNumber: degree.registrationNumber,
    program: degree.program,
    degreeTitle: degree.degreeTitle,
    cgpa: degree.cgpa,
    admissionYear: degree.admissionYear,
    graduationYear: degree.graduationYear,
    issuedAt: new Date().toISOString(),
  };

  const degreeHash = hashDegreeData(payload);

  try {
    // Call smart contract function
    const tx = await contract.issueDegree(degreeId, degreeHash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction failed - no receipt');
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      degreeHash,
      issuedAt: payload.issuedAt,
    };
  } catch (error: any) {
    console.error('Blockchain issue error:', error);
    throw new Error(`Failed to issue degree: ${error.message}`);
  }
}

/**
 * Verify a degree on the blockchain
 */
export async function verifyDegreeOnChain(
  degreeId: string,
  contractAddress: string
): Promise<{
  valid: boolean;
  degreeHash: string;
  timestamp: number;
  blockNumber?: number;
  txHash?: string;
}> {
  try {
    // Use public RPC provider (no wallet needed for read-only)
    const provider = new ethers.JsonRpcProvider(
      `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_KEY}`
    );

    const contract = new ethers.Contract(contractAddress, DEGREE_REGISTRY_ABI, provider);

    const [valid, degreeHash, timestamp] = await contract.verifyDegree(degreeId);

    return {
      valid,
      degreeHash,
      timestamp: Number(timestamp) * 1000, // Convert to milliseconds
    };
  } catch (error: any) {
    console.error('Blockchain verification error:', error);
    throw new Error(`Failed to verify degree: ${error.message}`);
  }
}

/**
 * Revoke a degree on the blockchain (admin only)
 */
export async function revokeDegreeOnChain(
  degreeId: string,
  contractAddress: string
): Promise<{ txHash: string; blockNumber: number }> {
  await switchToSepolia();

  const { signer } = await connectWallet();
  const contract = new ethers.Contract(contractAddress, DEGREE_REGISTRY_ABI, signer);

  try {
    const tx = await contract.revokeDegree(degreeId);
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction failed');
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error: any) {
    throw new Error(`Failed to revoke degree: ${error.message}`);
  }
}

/**
 * Get current account balance
 */
export async function getAccountBalance(): Promise<string> {
  const { provider, address } = await connectWallet();
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Listen for degree issued events
 */
export function listenToDegreeEvents(
  contractAddress: string,
  onDegreeIssued: (event: any) => void
): (() => void) {
  const provider = new ethers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_KEY}`
  );

  const contract = new ethers.Contract(contractAddress, DEGREE_REGISTRY_ABI, provider);

  const listener = (degreeId: string, degreeHash: string, timestamp: number) => {
    onDegreeIssued({ degreeId, degreeHash, timestamp: Number(timestamp) * 1000 });
  };

  contract.on('DegreeIssued', listener);

  // Return unsubscribe function
  return () => {
    contract.off('DegreeIssued', listener);
  };
}

export { ethers };
