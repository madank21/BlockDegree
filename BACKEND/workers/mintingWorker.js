// /workers/mintingWorker.js — Supabase only (no MongoDB)
require("dotenv").config();

const { Worker }        = require("bullmq");
const { createRedisConnection } = require("../src/config/redis");
const blockchainService = require("../services/blockchainService");
const QRService         = require("../services/qrService");
const ipfsService       = require("../services/ipfsService");
const { logger }        = require("../src/utils/logger");
const Degree            = require("../models/Degree");
const AuditLog          = require("../models/AuditLog");

const worker = new Worker(
  "blockchain-minting",

  async (job) => {
    const { degreeId } = job.data;
    logger.info(`[Worker] Job ${job.id}: degree=${degreeId}`);
    await job.updateProgress(10);

    // Fetch from Supabase
    const degree = await Degree.findById(degreeId);
    if (!degree) throw new Error(`Degree ${degreeId} not found in Supabase`);

    if (degree.blockchain_sync_status === "success") {
      logger.warn(`[Worker] Already minted: ${degreeId}`);
      return { skipped: true, txHash: degree.blockchain_tx_hash };
    }

    await Degree.update(degreeId, { blockchainSyncStatus: "processing" });
    await job.updateProgress(20);

    // Issue on blockchain
    const result = await blockchainService.issueDegree({
      degreeId:           String(degree.id),
      studentName:        degree.student_name,
      registrationNumber: degree.student_id,
      department:         degree.field_of_study,
      program:            degree.degree_title,
      cgpa:               String(degree.gpa || 0),
      graduationYear:     new Date(degree.graduation_date).getFullYear().toString(),
      degreeHash:         degree.degree_hash,
      ipfsCID:            degree.ipfs_cid || "",
    });

    await job.updateProgress(60);

    // Update Supabase with blockchain result
    await Degree.update(degreeId, {
      blockchainTxHash:      result.txHash,
      blockchainBlockNumber: result.blockNumber,
      blockchainTimestamp:   result.timestamp,
      status:                "issued",
      blockchainSyncStatus:  "success",
    });

    await job.updateProgress(70);

    // Upload metadata to IPFS (non-fatal)
    try {
      const ipfsResult = await ipfsService.uploadDegreeMetadata({
        degreeId:        degree.id,
        studentName:     degree.student_name,
        studentId:       degree.student_id,
        degreeTitle:     degree.degree_title,
        fieldOfStudy:    degree.field_of_study,
        graduationDate:  degree.graduation_date,
        gpa:             degree.gpa,
        institutionId:   degree.institution_id,
        institutionName: degree.institution_name,
        degreeHash:      degree.degree_hash,
        txHash:          result.txHash,
      });
      await Degree.update(degreeId, { ipfsCid: ipfsResult.cid, ipfsGatewayUrl: ipfsResult.gatewayUrl });
      logger.info(`[Worker] IPFS: ${ipfsResult.cid}`);
    } catch (e) {
      logger.error(`[Worker] IPFS failed (non-fatal): ${e.message}`);
    }

    await job.updateProgress(85);

    // Generate QR (non-fatal)
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify/${degree.id}/${degree.degree_hash}`;
      const qr = await QRService.generateDegreeQR(String(degree.id), degree.degree_hash, result.txHash, verificationUrl);
      await Degree.update(degreeId, { qrCodeUrl: qr });
    } catch (e) {
      logger.error(`[Worker] QR failed (non-fatal): ${e.message}`);
    }

    await AuditLog.create({
      action: "DEGREE_MINTED", targetId: degree.id, targetType: "degree",
      details: { txHash: result.txHash, blockNumber: result.blockNumber },
    });

    await job.updateProgress(100);
    logger.info(`[Worker] Minted ${degreeId}: TX=${result.txHash}`);
    return { txHash: result.txHash, blockNumber: result.blockNumber, degreeId };
  },

  { connection: createRedisConnection(), concurrency: 3, limiter: { max: 10, duration: 60000 } }
);

worker.on("completed", (job, result) => logger.info(`[Worker] Job ${job.id} done: ${result.txHash}`));

worker.on("failed", async (job, err) => {
  logger.error(`[Worker] Job ${job.id} failed (${job.attemptsMade}): ${err.message}`);
  if (job.attemptsMade >= job.opts.attempts) {
    await Degree.update(job.data.degreeId, { blockchainSyncStatus: "failed" })
      .catch((e) => logger.error(`[Worker] Status update failed: ${e.message}`));
  }
});

worker.on("error", (err) => logger.error(`[Worker] Error: ${err.message}`));

const shutdown = async () => { await worker.close(); process.exit(0); };
process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);

logger.info("[Worker] Minting worker started — Supabase backend");