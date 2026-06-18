// /server.js — Supabase only (no MongoDB connection)
require("dotenv").config();

const app = require("./app");
const { logger } = require("./src/utils/logger");
const { checkSupabaseConnection } = require("./database/supabase");

const PORT = parseInt(process.env.PORT) || 5000;

const REQUIRED_ENV = [
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "BLOCKCHAIN_RPC_URL",
  "PRIVATE_KEY",
  "CONTRACT_ADDRESS",
];

console.log('SUPABASE_URL=', process.env.SUPABASE_URL);

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n❌ Missing environment variables:\n   ${missing.join("\n   ")}\n`);
  process.exit(1);
}

const startServer = async () => {
  const connected = await checkSupabaseConnection();
  if (!connected) {
    logger.warn("[Server] Supabase connection check failed — verify credentials in .env");
  }

  const server = app.listen(PORT, () => {
    logger.info(`
╔══════════════════════════════════════╗
║     BlockDegree API — v3.0          ║
║  DB:   Supabase (PostgreSQL)        ║
║  Port: ${String(PORT).padEnd(28)}║
║  Env:  ${(process.env.NODE_ENV || "development").padEnd(28)}║
╚══════════════════════════════════════╝
    `);
  });

  const shutdown = (sig) => {
    logger.info(`[Server] ${sig} — shutting down`);
    server.close(() => { logger.info("[Server] Closed"); process.exit(0); });
    setTimeout(() => process.exit(1), 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("unhandledRejection", (r) => logger.error("[Server] Unhandled rejection:", r));
  process.on("uncaughtException",  (e) => { logger.error(`[Server] Uncaught: ${e.message}`); process.exit(1); });
};

startServer();