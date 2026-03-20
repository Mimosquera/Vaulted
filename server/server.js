import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Routes
import authRoutes from './routes/auth.js';
import collectionRoutes from './routes/collections.js';
import itemRoutes from './routes/items.js';
import syncRoutes from './routes/sync.js';
import imageRoutes from './routes/images.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initDatabase } from './config/initDatabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const BODY_LIMIT = process.env.BODY_LIMIT || '2mb';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

function buildErrorEnvelope(req, status, message) {
  return {
    error: {
      message,
      status,
      requestId: req.id || null,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    },
  };
}

// Security headers
app.use(helmet());

// Request context
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  req.requestStart = Date.now();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(buildErrorEnvelope(req, 429, 'Too many attempts. Try again later.'));
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(buildErrorEnvelope(req, 429, 'Too many requests. Slow down.'));
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(buildErrorEnvelope(req, 429, 'Upload limit reached. Try again later.'));
  },
});

// Body parsing with reasonable limits
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));

// Global request timeout guard
app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json(buildErrorEnvelope(req, 503, 'Request timeout. Please retry.'));
    }
  }, REQUEST_TIMEOUT_MS);

  const clear = () => clearTimeout(timeout);
  res.on('finish', clear);
  res.on('close', clear);

  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        process.env.CORS_ORIGIN,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
  })
);

// Apply rate limiters
app.use('/auth', authLimiter);
app.use('/api/images', uploadLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/collections/:collectionId/items', itemRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/images', imageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', requestId: req.id, uptime: process.uptime() });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
let server;

function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);

  if (!server) {
    process.exit(0);
    return;
  }

  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
      return;
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});

initDatabase().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
