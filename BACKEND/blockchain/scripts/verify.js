const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const deploymentPath = path.join(__dirname, '../deployments.json');
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('No deployments.json found. Deploy the contract first.');
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  if (!deployments[chainId]) {
    throw new Error(`No deployment found for chain ${chainId}`);
  }

  const { contractAddress } = deployments[chainId];
  console.log(`🔍 Verifying contract at ${contractAddress}...`);

  try {
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log('✅ Contract verified successfully');
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('ℹ️  Contract already verified');
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });