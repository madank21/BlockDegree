// services/blockchainService.js
const { ethers } = require('ethers');
const contractABI = require('../blockchain/contractABI.json');
const { logger } = require('../src/utils/logger');
const { supabaseAdmin } = require('../database/supabase');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.isInitialized = false;
    // Lazy initialization – call ensureConnected() before each operation
  }

  // ─── Lazy Initialization ─────────────────────────────────────────────
  async initialize() {
    if (this.isInitialized) return;

    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      throw new Error('Missing blockchain environment variables: SEPOLIA_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS');
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);

      const network = await this.provider.getNetwork();
      logger.info(`✅ Blockchain connected: ${network.name} (chainId: ${network.chainId})`);
      this.isInitialized = true;
    } catch (error) {
      logger.error('❌ Blockchain initialization failed:', error.message);
      throw new Error(`Blockchain initialization failed: ${error.message}`);
    }
  }

  async ensureConnected() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // ─── Issue Degree ─────────────────────────────────────────────────────
  async issueDegree(degreeData) {
    await this.ensureConnected();

    const {
      degreeId,
      studentName,
      registrationNumber,
      department,
      program,
      cgpa,
      graduationYear,
      degreeHash,
    } = degreeData;

    logger.info(`Issuing degree on blockchain: ${degreeId}`);

    try {
      const gasEstimate = await this.contract.issueDegree.estimateGas(
        degreeId,
        studentName,
        registrationNumber,
        department,
        program,
        cgpa,
        graduationYear,
        degreeHash
      );

      const gasLimit = BigInt(Math.floor(Number(gasEstimate) * 1.2)); // 20% buffer

      const tx = await this.contract.issueDegree(
        degreeId,
        studentName,
        registrationNumber,
        department,
        program,
        cgpa,
        graduationYear,
        degreeHash,
        { gasLimit }
      );

      logger.info(`Blockchain tx submitted: ${tx.hash}`);
      await this.savePendingTransaction(tx.hash, degreeId);

      const receipt = await tx.wait(1);
      logger.info(`Blockchain tx confirmed: ${tx.hash}, block: ${receipt.blockNumber}`);
      await this.updateTransactionStatus(tx.hash, 'confirmed', receipt);

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Blockchain issueDegree error:', error);
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  // ─── Verify Degree by Hash ────────────────────────────────────────────
  async verifyDegree(degreeHash) {
    await this.ensureConnected();
    try {
      const result = await this.contract.verifyByHash(degreeHash);
      return {
        exists: result[0],
        isValid: result[1],
        isRevoked: result[2],
        degreeId: result[3],
      };
    } catch (error) {
      logger.error('Blockchain verifyDegree error:', error);
      throw new Error(`Blockchain verification failed: ${error.message}`);
    }
  }

  // ─── Get Full Degree Details ──────────────────────────────────────────
  async getDegree(degreeId) {
    await this.ensureConnected();
    try {
      const result = await this.contract.getDegree(degreeId);
      // ✅ Correct mapping – matches Solidity return order:
      // 0: studentName, 1: registrationNumber, 2: department, 3: program,
      // 4: cgpa, 5: graduationYear, 6: degreeHash, 7: degreeId,
      // 8: issuerAddress, 9: timestamp, 10: isValid, 11: isRevoked
      return {
        studentName: result[0],
        registrationNumber: result[1],
        department: result[2],
        program: result[3],
        cgpa: result[4],
        graduationYear: result[5],
        degreeHash: result[6],
        degreeId: result[7],
        issuerAddress: result[8],
        timestamp: result[9].toString(),
        isValid: result[10],
        isRevoked: result[11],
      };
    } catch (error) {
      logger.error('Blockchain getDegree error:', error);
      throw new Error(`Failed to get degree: ${error.message}`);
    }
  }

  // ─── Revoke Degree ────────────────────────────────────────────────────
  async revokeDegree(degreeId) {
    await this.ensureConnected();
    try {
      const tx = await this.contract.revokeDegree(degreeId);
      const receipt = await tx.wait(1);
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Blockchain revokeDegree error:', error);
      throw new Error(`Blockchain revocation failed: ${error.message}`);
    }
  }

  // ─── Total Degrees Issued ─────────────────────────────────────────────
  async getTotalDegreesIssued() {
    await this.ensureConnected();
    try {
      const total = await this.contract.totalDegrees();
      return Number(total);
    } catch (error) {
      logger.error('Blockchain getTotalDegreesIssued error:', error);
      return 0;
    }
  }

  // ─── Network Info ─────────────────────────────────────────────────────
  async getNetworkInfo() {
    await this.ensureConnected();
    try {
      const [network, blockNumber, balance] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
        this.provider.getBalance(this.wallet.address),
      ]);
      return {
        networkName: network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        contractAddress: process.env.CONTRACT_ADDRESS,
        walletAddress: this.wallet.address,
        walletBalance: ethers.formatEther(balance),
      };
    } catch (error) {
      logger.error('getNetworkInfo error:', error);
      throw error;
    }
  }

  // ─── Transaction Details ──────────────────────────────────────────────
  async getTransaction(txHash) {
    await this.ensureConnected();
    try {
      const [tx, receipt] = await Promise.all([
        this.provider.getTransaction(txHash),
        this.provider.getTransactionReceipt(txHash),
      ]);
      return {
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        from: tx.from,
        to: tx.to,
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice?.toString(),
        status: receipt?.status === 1 ? 'success' : 'failed',
        gasUsed: receipt?.gasUsed?.toString(),
      };
    } catch (error) {
      logger.error('getTransaction error:', error);
      throw error;
    }
  }

  // ─── Database Helpers ────────────────────────────────────────────────
  async savePendingTransaction(txHash, degreeId) {
    try {
      await supabaseAdmin.from('blockchain_transactions').insert([{
        tx_hash: txHash,
        from_address: this.wallet.address,
        contract_address: process.env.CONTRACT_ADDRESS,
        function_name: 'issueDegree',
        degree_id: degreeId,
        status: 'pending',
      }]);
    } catch (error) {
      logger.error('Failed to save pending transaction:', error);
    }
  }

  async updateTransactionStatus(txHash, status, receipt = null) {
    try {
      const updateData = { status };
      if (receipt) {
        updateData.block_number = receipt.blockNumber;
        updateData.gas_used = Number(receipt.gasUsed);
        updateData.confirmed_at = new Date().toISOString();
      }
      await supabaseAdmin
        .from('blockchain_transactions')
        .update(updateData)
        .eq('tx_hash', txHash);
    } catch (error) {
      logger.error('Failed to update transaction status:', error);
    }
  }
}

module.exports = new BlockchainService();