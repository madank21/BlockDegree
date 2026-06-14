const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("Deploying DegreeRegistry...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const DegreeRegistry = await ethers.getContractFactory("DegreeRegistry");
    const contract = await DegreeRegistry.deploy();
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("Contract deployed at:", address);

    // Save contract address to file
    fs.writeFileSync("deployment.json", JSON.stringify({
        contractAddress: address,
        deployerAddress: deployer.address,
        deployedAt: new Date().toISOString()
    }, null, 2));

    console.log("Saved to deployment.json");
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });