const { ethers } = require("ethers");
require("dotenv").config();

async function testConnection() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    const walletAddress = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY).address;
    const balance = await provider.getBalance(walletAddress);
    console.log("✅ RPC connected!");
    console.log("Wallet:", walletAddress);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testConnection();