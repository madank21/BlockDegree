// BACKEND/app.js
// ─────────────────────────────────────────────────────────────────────────────
// Express Application Entry Point
// FIXES:
//   - Uncommented faceRoutes (face verification now reachable)
//   - Removed duplicate /uploads static mount
//   - Added /api/v1/face route
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const hpp         = require('hpp');
const path        = require('path');

const { logger }                       = require('./src/utils/logger');
const { errorHandler, notFound }       = require('./middleware/errorMiddleware');

// ─── Route imports ─────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const degreeRoutes       = require('./routes/degreeRoutes');
const documentRoutes     = require('./routes/documentRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const blockchainRoutes   = require('./routes/blockchainRoutes');
const faceRoutes         = require('./routes/faceRoutes');   // ← FIX: uncommented
const fraudRoutes        = require('./routes/fraudRoutes');
const userRoutes         = require('./routes/userRoutes');
const auditRoutes        = require('./routes/auditRoutes');
const adminRoutes        = require('./routes/adminRoutes');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
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

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX    || '100'),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiter application ──────────────────────────────────────────────────
app.use('/api/',        globalLimiter);
app.use('/api/v1/auth', authLimiter);

// ─── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ─── HTTP Parameter Pollution protection ──────────────────────────────────────
app.use(hpp());

// ─── HTTP Logging ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ─── Static file serving (uploads) ────────────────────────────────────────────
// FIX: single declaration (was duplicated at the bottom of the file)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Request-ID middleware ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  const { v4: uuidv4 } = require('uuid');
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ─── Health checks ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success:     true,
    message:     'BlockDegree API is running',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version:     '1.0.0',
  });
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    success:   true,
    message:   'API v1 is healthy',
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/degrees',      degreeRoutes);
app.use('/api/v1/documents',    documentRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/blockchain',   blockchainRoutes);
app.use('/api/v1/face',         faceRoutes);         // ← FIX: was commented out
app.use('/api/v1/fraud',        fraudRoutes);
app.use('/api/v1/users',        userRoutes);
app.use('/api/v1/audit-logs',   auditRoutes);
app.use('/api/v1/admin',        adminRoutes);

// ─── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;