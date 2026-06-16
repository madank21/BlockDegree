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
    this.initialize();
  }

  // ─── Initialize ─────────────────────────────────────────────────────────────
  async initialize() {
    try {
      this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
      this.wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, this.provider);
      this.contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        this.wallet
      );

      const network = await this.provider.getNetwork();
      logger.info(`✅ Blockchain connected: ${network.name} (chainId: ${network.chainId})`);
      this.isInitialized = true;
    } catch (error) {
      logger.error('❌ Blockchain initialization failed:', error.message);
    }
  }

  // ─── Ensure Connected ─────────────────────────────────────────────────────
  ensureConnected() {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }
  }

  // ─── Issue Degree on Blockchain ───────────────────────────────────────────
  async issueDegree(degreeData) {
    this.ensureConnected();

    try {
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

      // Estimate gas (optional but helpful)
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

      const tx = await this.contract.issueDegree(
        degreeId,
        studentName,
        registrationNumber,
        department,
        program,
        cgpa,
        graduationYear,
        degreeHash,
        { gasLimit: gasEstimate }
      );

      logger.info(`Blockchain tx submitted: ${tx.hash}`);

      // Save pending transaction
      await this.savePendingTransaction(tx.hash, degreeId);

      // Wait for confirmation
      const receipt = await tx.wait(1);

      logger.info(`Blockchain tx confirmed: ${tx.hash}, block: ${receipt.blockNumber}`);

      // Update transaction status
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

  // ─── Verify Degree by Hash ────────────────────────────────────────────────
  async verifyDegree(degreeHash) {
    this.ensureConnected();

    try {
      const result = await this.contract.verifyByHash(degreeHash);

      // The contract returns: (bool exists, bool isValid, bool isRevoked, string degreeId)
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

  // ─── Get Full Degree Details by ID ──────────────────────────────────────
  async getDegree(degreeId) {
    this.ensureConnected();

    try {
      const result = await this.contract.getDegree(degreeId);

      // The contract returns:
      // (string studentName, string registrationNumber, string department,
      //  string program, string cgpa, string graduationYear, string degreeHash,
      //  string degreeId, address issuerAddress, uint256 timestamp,
      //  bool isValid, bool isRevoked)
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

  // ─── Revoke Degree on Blockchain ──────────────────────────────────────────
  async revokeDegree(degreeId, reason) {
    this.ensureConnected();

    try {
      // Your contract might not have a `reason` parameter – adjust accordingly.
      // Assuming the contract is `revokeDegree(string degreeId)`
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

  // ─── Get Total Degrees Issued ─────────────────────────────────────────────
  async getTotalDegreesIssued() {
    this.ensureConnected();

    try {
      const total = await this.contract.totalDegrees();
      return Number(total);
    } catch (error) {
      logger.error('Blockchain getTotalDegreesIssued error:', error);
      return 0;
    }
  }

  // ─── Get Network Info ─────────────────────────────────────────────────────
  async getNetworkInfo() {
    this.ensureConnected();

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

  // ─── Get Transaction Details ──────────────────────────────────────────────
  async getTransaction(txHash) {
    this.ensureConnected();

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

  // ─── Save Pending Transaction ─────────────────────────────────────────────
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

  // ─── Update Transaction Status ────────────────────────────────────────────
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

module.exports = BlockchainService;