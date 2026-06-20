// BACKEND/scripts/verifyABI.js
const fs = require('fs');
const path = require('path');

// ----- ADJUST THIS PATH to point to your compiled contract JSON -----
// Relative from BACKEND/scripts to the Hardhat artifact
const abiPath = path.join(__dirname, '../blockchain/artifacts/contracts/DegreeRegistry.sol/DegreeRegistry.json');

const requiredFunctions = ['issueDegree', 'revokeDegree', 'verifyByHash'];

try {
  const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const abi = artifact.abi;

  const functionNames = abi
    .filter(item => item.type === 'function')
    .map(item => item.name);

  let allFound = true;
  requiredFunctions.forEach(func => {
    if (functionNames.includes(func)) {
      console.log(`✅ ${func}`);
    } else {
      console.log(`❌ MISSING: ${func}`);
      allFound = false;
    }
  });

  if (allFound) {
    console.log('\n✅ All required functions are present in the ABI.');
  } else {
    console.log('\n❌ Some functions are missing. Recompile your contracts and update the ABI.');
  }

} catch (error) {
  console.error('Error reading ABI file:', error.message);
  console.log('Make sure the ABI path is correct and the file exists.');
}