/**
 * Express Application
 * Path: BACKEND/app.js
 *
 * Fixed:
 *  1. Uncommented faceRoutes (was commented out — entire FaceVerification feature was broken).
 *  2. CORS origins now also support production env var FRONTEND_URL.
 *  3. Removed duplicate /uploads static route.
 */

const path        = require('path');
require('dotenv').config();

// Add the tensorflow.dll directory to process.env.PATH so Windows can load the native addon successfully.
const tfjsNodeLibPath = path.join(__dirname, 'node_modules', '@tensorflow', 'tfjs-node', 'deps', 'lib');
process.env.PATH = `${tfjsNodeLibPath};${process.env.PATH}`;

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const hpp         = require('hpp');

const { logger }                   = require('./src/utils/logger');
const { errorHandler, notFound }   = require('./middleware/errorMiddleware');

// ── Route imports ──────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const degreeRoutes       = require('./routes/degreeRoutes');
const documentRoutes     = require('./routes/documentRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const blockchainRoutes   = require('./routes/blockchainRoutes');
const faceRoutes         = require('./routes/faceRoutes');   // FIXED: was commented out
const fraudRoutes        = require('./routes/fraudRoutes');
const userRoutes         = require('./routes/userRoutes');
const auditRoutes        = require('./routes/auditRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const applicationRoutes = require('./routes/application.routes');
const app = express();

// ── Security Middleware ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'blob:'],
      scriptSrc:  ["'self'"],
    },
  },
}));

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,        // production frontend URL from env
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ── Rate Limiting ──────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs:       parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max:            parseInt(process.env.RATE_LIMIT_MAX    || '200'),
  message:        { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many authentication attempts, please try again later.' },
});

const blockchainLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      50,
  message:  { success: false, message: 'Blockchain operation rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Body Parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Apply Rate Limiters ────────────────────────────────────────────────────────
app.use('/api/', globalLimiter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/blockchain', blockchainLimiter);

// ── Compression ────────────────────────────────────────────────────────────────
app.use(compression());

// ── HTTP Parameter Pollution ───────────────────────────────────────────────────
app.use(hpp());

// ── Logging ────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ── Static Files ───────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Request ID Middleware ──────────────────────────────────────────────────────
app.use((req, res, next) => {
  const { v4: uuidv4 } = require('uuid');
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ── Health Checks ──────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let faceStatus = { loaded: false };
  try {
    const { getModelsStatus } = require('./services/faceVerificationService');
    faceStatus = getModelsStatus();
  } catch { /* optional */ }

  let blockchainStatus = 'disabled';
  if (process.env.BLOCKCHAIN_RPC_URL) {
    try {
      const blockchainService = require('./services/blockchainService');
      await blockchainService.ensureConnected();
      blockchainStatus = 'connected';
    } catch {
      blockchainStatus = 'error';
    }
  }

  return res.status(200).json({
    success:     true,
    message:     'BlockDegree API is running',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version:     '1.0.0',
    services: {
      face: faceStatus,
      blockchain: blockchainStatus,
    },
  });
});

app.get('/api/v1/health', async (_req, res) => {
  let faceStatus = { loaded: false };
  try {
    const { getModelsStatus } = require('./services/faceVerificationService');
    faceStatus = getModelsStatus();
  } catch { /* optional */ }

  let blockchainStatus = 'disabled';
  if (process.env.BLOCKCHAIN_RPC_URL) {
    try {
      const blockchainService = require('./services/blockchainService');
      await blockchainService.ensureConnected();
      blockchainStatus = 'connected';
    } catch {
      blockchainStatus = 'error';
    }
  }

  return res.status(200).json({
    success:   true,
    message:   'API v1 is healthy',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      face: faceStatus,
      blockchain: blockchainStatus,
    },
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/degrees',      degreeRoutes);
app.use('/api/v1/documents',    documentRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/blockchain',   blockchainRoutes);
app.use('/api/v1/face',         faceRoutes);    // FIXED: was commented out
app.use('/api/v1/fraud',        fraudRoutes);
app.use('/api/v1/users',        userRoutes);
app.use('/api/v1/audit-logs',   auditRoutes);
app.use('/api/v1/admin',        adminRoutes);
app.use('/api/applications', applicationRoutes);
// ── Error Handling ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;