/// <reference types="vite/client" />

import { ethers } from 'ethers';
import DegreeRegistryABI from '../../artifacts/contracts/DegreeRegistry.sol/DegreeRegistry.json';

// Type declaration for window.ethereum (MetaMask)
declare global {
  interface Window {
    ethereum?: any;
  }
}

// ── Provider & Signer ──────────────────────────────────────────────────────

/**
 * Returns a read-only provider connected to local Ganache.
 * Used for getDegree / verifyByHash (no signature needed).
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

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

/**
 * Read-only contract — for queries that don't change state.
 */
export function getReadContract(): ethers.Contract {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, DegreeRegistryABI.abi, provider);
}

/**
 * Write contract — for issuance and revocation (requires signer).
 */
export async function getWriteContract(): Promise<ethers.Contract> {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, DegreeRegistryABI.abi, signer);
}

// ── Network Health Check ────────────────────────────────────────────────────

/**
 * Ping Ganache to confirm it is running before attempting operations.
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
