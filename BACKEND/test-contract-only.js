// BACKEND/test-contract-only.js
require('dotenv').config();

// ✅ Import the already-instantiated singleton
const blockchainService = require('./services/blockchainService');

async function test() {
  console.log('🔍 Checking environment variables...');
  console.log('BLOCKCHAIN_RPC_URL:', process.env.BLOCKCHAIN_RPC_URL ? '✅ Set' : '❌ Missing');
  console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? '✅ Set (length: ' + process.env.PRIVATE_KEY.length + ')' : '❌ Missing');
  console.log('CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS ? '✅ Set' : '❌ Missing');

  try {
    // 1. Ensure connection and get network info
    await blockchainService.ensureConnected();
    const networkInfo = await blockchainService.getNetworkInfo();
    console.log('\n✅ Connected to blockchain:');
    console.log(`   Network: ${networkInfo.networkName} (chainId: ${networkInfo.chainId})`);
    console.log(`   Block: ${networkInfo.blockNumber}`);
    console.log(`   Contract: ${networkInfo.contractAddress}`);
    console.log(`   Wallet: ${networkInfo.walletAddress}`);
    console.log(`   Balance: ${networkInfo.walletBalance} ETH`);

    // 2. Test verification with a dummy hash (all zeros)
    const testHash = '0x' + '0'.repeat(64);
    console.log(`\n🔎 Verifying dummy hash: ${testHash}`);
    const result = await blockchainService.verifyDegree(testHash);
    console.log('Verification result:', result);

    // 3. Get total degrees issued
    const total = await blockchainService.getTotalDegreesIssued();
    console.log(`\n📊 Total degrees issued on chain: ${total}`);

    console.log('\n✅ All contract calls successful!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.reason) console.error('   Reason:', error.reason);
    if (error.code) console.error('   Code:', error.code);
    process.exit(1);
  }
}

test();