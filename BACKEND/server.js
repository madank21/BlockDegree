// /server.js — Supabase + Redis + Blockchain-ready bootstrap
require("dotenv").config();

const app = require("./app");
const { logger } = require("./src/utils/logger");
const { checkSupabaseConnection } = require("./database/supabase");

const PORT = parseInt(process.env.PORT, 10) || 5000;

/**
 * CORE required environment variables (must exist in ALL environments)
 */
const CORE_ENV = [
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_KEY",
];

/**
 * BLOCKCHAIN required variables (only strictly required in production)
 */
const BLOCKCHAIN_ENV = [
  "BLOCKCHAIN_RPC_URL",
  "PRIVATE_KEY",
  "CONTRACT_ADDRESS",
];

/**
 * Validate environment variables
 */
const missingCore = CORE_ENV.filter((k) => !process.env[k]);
if (missingCore.length > 0) {
  console.error(`\n❌ Missing CORE environment variables:\n   ${missingCore.join("\n   ")}\n`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  const missingBlockchain = BLOCKCHAIN_ENV.filter((k) => !process.env[k]);
  if (missingBlockchain.length > 0) {
    console.error(`\n❌ Missing BLOCKCHAIN environment variables:\n   ${missingBlockchain.join("\n   ")}\n`);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
const setupGracefulShutdown = (server) => {
  const shutdown = (signal) => {
    logger.info(`[Server] ${signal} received — shutting down gracefully`);

    server.close(() => {
      logger.info("[Server] HTTP server closed");
      process.exit(0);
    });

    // force shutdown after timeout
    setTimeout(() => {
      logger.error("[Server] Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("[Server] Uncaught Exception:", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("[Server] Unhandled Rejection:", reason);
    process.exit(1);
  });
};

/**
 * Initialize external services safely
 */
const initializeServices = async () => {
  // 1. Supabase check
  const connected = await checkSupabaseConnection();

  if (!connected) {
    const msg = "[Server] Supabase connection failed";

    if (process.env.NODE_ENV === "production") {
      logger.error(msg + " — exiting process");
      process.exit(1);
    } else {
      logger.warn(msg + " — continuing in development mode");
    }
  }

  // 2. Redis (optional but recommended)
  if (process.env.REDIS_URL) {
    try {
      const { connectRedis } = require("./src/config/redis");
      await connectRedis();
      logger.info("[Server] Redis connected");
    } catch (err) {
      logger.warn("[Server] Redis connection failed:", err.message);
    }
  }

  // 3. Register queue (so workers can pick jobs)
  try {
    require("./queues/mintingQueue");
    logger.info("[Server] Minting queue initialized");
  } catch (err) {
    logger.warn("[Server] Minting queue not loaded:", err.message);
  }

  // 4. Blockchain sanity log (no secrets)
  if (process.env.BLOCKCHAIN_RPC_URL) {
    logger.info("[Server] Blockchain config detected");
  }
};

/**
 * Start server
 */
const startServer = async () => {
  try {
    await initializeServices();

    const server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════╗
║        BlockDegree API — v3.0             ║
╠════════════════════════════════════════════╣
║  Environment : ${process.env.NODE_ENV || "development"}                 
║  Port         : ${PORT}                              
║  Database     : Supabase (PostgreSQL)     
║  Queue        : BullMQ (if enabled)        
║  Blockchain   : ${process.env.BLOCKCHAIN_RPC_URL ? "Enabled" : "Disabled"}
╚════════════════════════════════════════════╝
      `);
    });

    server.on("error", (err) => {
      logger.error("[Server] Failed to start HTTP server:", err);
      process.exit(1);
    });

    setupGracefulShutdown(server);
  } catch (err) {
    logger.error("[Server] Fatal startup error:", err);
    process.exit(1);
  }
};

startServer();