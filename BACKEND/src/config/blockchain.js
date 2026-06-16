const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * Load contract ABI
 * Make sure contractABI.json is generated in your Hardhat project
 */
const abiPath = path.join(
  __dirname,
  "../../../blockchain/contractABI.json"
);

if (!fs.existsSync(abiPath)) {
  throw new Error("❌ contractABI.json not found. Deploy contract first.");
}

const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));

/**
 * Validate environment variables
 */
if (!process.env.SEPOLIA_RPC_URL) {
  throw new Error("❌ SEPOLIA_RPC_URL missing in .env");
}

if (!process.env.PRIVATE_KEY) {
  throw new Error("❌ PRIVATE_KEY missing in .env");
}

if (!process.env.CONTRACT_ADDRESS) {
  throw new Error("❌ CONTRACT_ADDRESS missing in .env");
}

/**
 * Connect to Ethereum network (Sepolia)
 */
const provider = new ethers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL
);

/**
 * Create wallet signer
 */
const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  provider
);

/**
 * Create contract instance
 */
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  abi,
 wallet
);

/**
 * Helper: Get contract read-only instance (optional)
 */
const getReadOnlyContract = () => {
  return new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    abi,
    provider
  );
};

/**
 * Helper: Get wallet address
 */
const getWalletAddress = async () => {
  return await wallet.getAddress();
};

module.exports = {
  contract,
  provider,
  wallet,
  getReadOnlyContract,
  getWalletAddress,
};