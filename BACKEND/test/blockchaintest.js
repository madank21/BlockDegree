require("dotenv").config();
const { ethers } = require("ethers");

async function testBlockchain() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

    const walletAddress = process.env.BLOCKCHAIN_PRIVATE_KEY; // replace this

    const balance = await provider.getBalance(walletAddress);

    console.log("Balance:", ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.error("Blockchain test failed:", error.message);
  }
}

testBlockchain();