require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// 🔥 Fail fast if env is missing (prevents HH117 confusion)
function mustGetEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${name}`);
  }
  return value;
}

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhat: {
      chainId: 31337,
    },

    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // 🔵 SEPOLIA FIXED
    sepolia: {
      url: mustGetEnv("SEPOLIA_RPC_URL"),
      accounts: [mustGetEnv("BLOCKCHAIN_PRIVATE_KEY")],
      chainId: 11155111,
    },

    // 🟠 Polygon Amoy
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 80002,
    },

    // 🟣 Polygon Mainnet
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 137,
    },
  },

  etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY,
},

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};