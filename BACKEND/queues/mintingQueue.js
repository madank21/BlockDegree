let ipfsService;
try {
  ipfsService = require("../services/ipfsService");
} catch (err) {
  console.warn("IPFS service not found — continuing without IPFS");
}

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("Redis connected");
  }
};

module.exports = {
  redisClient,
  connectRedis,
};