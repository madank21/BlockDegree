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
        degreeHash,
        graduateAddress,
        studentName,
        degreeTitle,
        institutionName,
        graduationDate,
        certificateNumber,
      } = degreeData;

      logger.info(`Issuing degree on blockchain: ${degreeHash}`);

      const gasEstimate = await this.contract.issueDegree.estimateGas(
        degreeHash,
        graduateAddress || ethers.ZeroAddress,
        studentName,
        degreeTitle,
        institutionName,
        Math.floor(new Date(graduationDate).getTime() / 1000),
        certificateNumber
      );

      const tx = await this.contract.issueDegree(
        degreeHash,
        graduateAddress || ethers.ZeroAddress,
        studentName,
        degreeTitle,
        institutionName,
        Math.floor(new Date(graduationDate).getTime() / 1000),
        certificateNumber,
        {
          gasLimit: Math.floor(Number(gasEstimate) * 1.2), // 20% buffer
        }
      );

      logger.info(`Blockchain tx submitted: ${tx.hash}`);

      // Save pending transaction
      await this.savePendingTransaction(tx.hash, degreeData.degreeId);

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
        tokenId: this.extractTokenId(receipt),
      };
    } catch (error) {
      logger.error('Blockchain issueDegree error:', error);
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  // ─── Verify Degree on Blockchain ──────────────────────────────────────────
  async verifyDegree(degreeHash) {
    this.ensureConnected();

    try {
      const result = await this.contract.verifyDegree(degreeHash);

      return {
        isValid: result.isValid,
        isRevoked: result.isRevoked,
        studentName: result.studentName,
        degreeTitle: result.degreeTitle,
        institutionName: result.institutionName,
        graduationDate: new Date(Number(result.graduationDate) * 1000).toISOString(),
        certificateNumber: result.certificateNumber,
        issueTimestamp: new Date(Number(result.issueTimestamp) * 1000).toISOString(),
      };
    } catch (error) {
      logger.error('Blockchain verifyDegree error:', error);
      throw new Error(`Blockchain verification failed: ${error.message}`);
    }
  }

  // ─── Revoke Degree on Blockchain ──────────────────────────────────────────
  async revokeDegree(degreeHash, reason) {
    this.ensureConnected();

    try {
      const tx = await this.contract.revokeDegree(degreeHash, reason);
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

  // ─── Get Degree by Token ID ───────────────────────────────────────────────
  async getDegreeByTokenId(tokenId) {
    this.ensureConnected();

    try {
      const result = await this.contract.getDegreeByTokenId(tokenId);
      return result;
    } catch (error) {
      logger.error('Blockchain getDegreeByTokenId error:', error);
      throw new Error(`Failed to get degree: ${error.message}`);
    }
  }

  // ─── Get Total Degrees Issued ─────────────────────────────────────────────
  async getTotalDegreesIssued() {
    this.ensureConnected();

    try {
      const total = await this.contract.totalSupply();
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

  // ─── Extract Token ID from Receipt ───────────────────────────────────────
  extractTokenId(receipt) {
    try {
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'DegreeIssued' || parsed?.name === 'Transfer';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        return parsed.args.tokenId?.toString();
      }
    } catch (error) {
      logger.warn('Could not extract token ID:', error.message);
    }
    return null;
  }
}

// Singleton instance
// const blockchainService = new BlockchainService();
// module.exports = blockchainService;
module.exports = BlockchainService; 