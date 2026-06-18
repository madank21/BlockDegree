// /workers/mintingWorker.js — Supabase only (no MongoDB)
require("dotenv").config();

const { Worker } = require("bullmq");
const { redisClient } = require("../src/config/redis");

const blockchainService = require("../services/blockchainService");
const QRService = require("../services/qrService");
const ipfsService = require("../services/ipfsService");
const { logger } = require("../src/utils/logger");

const Degree = require("../models/Degree");
const AuditLog = require("../models/AuditLog");

/**
 * Ensure Redis is ready before worker starts
 */
async function initWorker() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info("[Worker] Redis connected");
  }

  const worker = new Worker(
    "mintingQueue", // queue name standardized

    async (job) => {
      const { degreeId } = job.data;

      logger.info(`[Worker] Job ${job.id}: degree=${degreeId}`);
      await job.updateProgress(10);

      // ==============================
      // 0. FETCH DEGREE
      // ==============================
      const degree = await Degree.findById(degreeId);
      if (!degree) {
        throw new Error(`Degree ${degreeId} not found in Supabase`);
      }

      // Skip if already minted
      if (degree.blockchain_sync_status === "success") {
        logger.warn(`[Worker] Already minted: ${degreeId}`);
        return {
          skipped: true,
          txHash: degree.blockchain_tx_hash,
        };
      }

      await Degree.update(degreeId, {
        blockchainSyncStatus: "processing",
      });

      await job.updateProgress(20);

      // ==============================
      // 1. ISSUE ON BLOCKCHAIN
      // ==============================
      const result = await blockchainService.issueDegree({
        degreeId: String(degree.id),
        studentName: degree.student_name,
        registrationNumber: degree.student_id,
        department: degree.field_of_study,
        program: degree.degree_title,
        cgpa: String(degree.gpa || 0),
        graduationYear: new Date(degree.graduation_date)
          .getFullYear()
          .toString(),
        degreeHash: degree.degree_hash,
        ipfsCID: degree.ipfs_cid || "",
      });

      await job.updateProgress(60);

      // ==============================
      // 2. UPDATE SUPABASE (BLOCKCHAIN RESULT)
      // ==============================
      await Degree.update(degreeId, {
        blockchain_tx_hash: result.txHash,
        blockchainBlockNumber: result.blockNumber,
        blockchainTimestamp: result.timestamp,
        status: "issued",
        blockchainSyncStatus: "success",
      });

      await job.updateProgress(70);

      // ==============================
      // 3. IPFS UPLOAD (SAFE GUARD ADDED)
      // ==============================

      let ipfsCid = null;
      let ipfsGatewayUrl = null;

      const metadata = {
        degreeId: degree.id,
        studentName: degree.student_name,
        studentId: degree.student_id,
        degreeTitle: degree.degree_title,
        fieldOfStudy: degree.field_of_study,
        graduationDate: degree.graduation_date,
        gpa: degree.gpa,
        institutionId: degree.institution_id,
        institutionName: degree.institution_name,
        degreeHash: degree.degree_hash,
        txHash: result.txHash,
      };

      if (ipfsService?.uploadDegreeMetadata) {
        try {
          const ipfsResult = await ipfsService.uploadDegreeMetadata(metadata);

          ipfsCid = ipfsResult.cid;
          ipfsGatewayUrl = ipfsResult.gatewayUrl;

          await Degree.update(degreeId, {
            ipfsCid,
            ipfsGatewayUrl,
          });

          logger.info(`[Worker] IPFS uploaded: ${ipfsCid}`);
        } catch (err) {
          logger.error(`[Worker] IPFS failed (non-fatal): ${err.message}`);
        }
      } else {
        logger.warn("[Worker] IPFS service not available — skipping upload");
      }

      await job.updateProgress(85);

      // ==============================
      // 4. QR GENERATION (NON-FATAL)
      // ==============================
      try {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify/${degree.id}/${degree.degree_hash}`;

        const qr = await QRService.generateDegreeQR(
          String(degree.id),
          degree.degree_hash,
          result.txHash,
          verificationUrl
        );

        await Degree.update(degreeId, { qrCodeUrl: qr });
      } catch (err) {
        logger.error(`[Worker] QR failed (non-fatal): ${err.message}`);
      }

      // ==============================
      // 5. AUDIT LOG
      // ==============================
      await AuditLog.create({
        action: "DEGREE_MINTED",
        targetId: degree.id,
        targetType: "degree",
        details: {
          txHash: result.txHash,
          blockNumber: result.blockNumber,
        },
      });

      await job.updateProgress(100);

      logger.info(`[Worker] Minted ${degreeId}: TX=${result.txHash}`);

      return {
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        degreeId,
      };
    },

    {
      connection: redisClient,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60000,
      },
    }
  );

  // ==============================
  // WORKER EVENTS
  // ==============================
  worker.on("completed", (job, result) => {
    logger.info(
      `[Worker] Job ${job.id} done: ${result?.txHash || "N/A"}`
    );
  });

  worker.on("failed", async (job, err) => {
    logger.error(
      `[Worker] Job ${job.id} failed (${job.attemptsMade}): ${err.message}`
    );

    if (job.attemptsMade >= job.opts.attempts) {
      await Degree.update(job.data.degreeId, {
        blockchainSyncStatus: "failed",
      }).catch((e) =>
        logger.error(`[Worker] Status update failed: ${e.message}`)
      );
    }
  });

  worker.on("error", (err) => {
    logger.error(`[Worker] Error: ${err.message}`);
  });

  // ==============================
  // SHUTDOWN HANDLERS
  // ==============================
  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  logger.info("[Worker] Minting worker started — Supabase backend");

  return worker;
}

// Start worker
initWorker().catch((err) => {
  logger.error(`[Worker] Failed to start: ${err.message}`);
});