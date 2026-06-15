// test-contract-only.js
require("dotenv").config();  // Load .env variables


const blockchainService = require("./services/BlockchainService"); // ← no braces, no 'new'


async function test() {
  try {
    console.log("Checking environment...");
    console.log("RPC URL:", process.env.BLOCKCHAIN_RPC_URL ? "✅ Set" : "❌ Missing");
    console.log("Private key:", process.env.BLOCKCHAIN_PRIVATE_KEY ? "✅ Set (length: " + process.env.BLOCKCHAIN_PRIVATE_KEY.length + ")" : "❌ Missing");
    console.log("Contract address:", process.env.CONTRACT_ADDRESS ? "✅ Set" : "❌ Missing");

    const service = new BlockchainService();
    
    const testHash = "0x" + "0".repeat(64);
    const result = await blockchainService.verifyDegree(testHash);
    console.log(result);
    
    console.log("\n✅ Contract call successful!");
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

test();