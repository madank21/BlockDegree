const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Deploying DegreeRegistry contract...');

  const [deployer] = await ethers.getSigners();
  console.log(`📋 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  // Deploy
  const DegreeRegistry = await ethers.getContractFactory('DegreeRegistry');
  const contract = await DegreeRegistry.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`✅ DegreeRegistry deployed to: ${contractAddress}`);

  // Get deployment transaction
  const deployTx = contract.deploymentTransaction();
  const receipt = await deployTx.wait();
  console.log(`📦 Block number: ${receipt.blockNumber}`);
  console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

  // Save deployment info
  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    blockNumber: receipt.blockNumber,
    transactionHash: receipt.hash,
    deployedAt: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, '../deployments.json');
  let deployments = {};
  
  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  }
  
  deployments[deploymentInfo.chainId] = deploymentInfo;
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));

  // Copy ABI to backend
  const artifactPath = path.join(
    __dirname,
    '../artifacts/contracts/DegreeRegistry.sol/DegreeRegistry.json'
  );
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const backendABIPath = path.join(__dirname, '../../backend/blockchain/contractABI.json');
    fs.writeFileSync(backendABIPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`📄 ABI copied to backend: ${backendABIPath}`);
  }

  console.log('\n📝 Update your .env file:');
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  
  return contractAddress;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment complete! Contract: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });