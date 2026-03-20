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
import { requestLogger, logInfo, logError } from './middleware/logger.js';
import { metricsMiddleware, getMetricsSnapshot } from './middleware/metrics.js';
import { initDatabase } from './config/initDatabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const BODY_LIMIT = process.env.BODY_LIMIT || '2mb';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 20000);
const METRICS_ENABLED = process.env.METRICS_ENABLED !== 'false';

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

// Structured request/response logs
app.use(requestLogger);

// In-memory request metrics
if (METRICS_ENABLED) {
  app.use(metricsMiddleware);
}

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

app.get('/metrics', (req, res) => {
  if (!METRICS_ENABLED) {
    res.status(404).json(buildErrorEnvelope(req, 404, 'Metrics endpoint is disabled'));
    return;
  }

  res.json({
    requestId: req.id,
    generatedAt: new Date().toISOString(),
    metrics: getMetricsSnapshot(),
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
let server;

function shutdown(signal) {
  logInfo('server.shutdown.start', { signal });

  if (!server) {
    process.exit(0);
    return;
  }

  server.close((err) => {
    if (err) {
      logError('server.shutdown.error', {
        signal,
        error: err.message,
      });
      process.exit(1);
      return;
    }

    logInfo('server.shutdown.complete', { signal });

    process.exit(0);
  });

  setTimeout(() => {
    logError('server.shutdown.forced', { signal, timeoutMs: 10000 });
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logError('process.unhandledRejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (err) => {
  logError('process.uncaughtException', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});

initDatabase().then(() => {
  server = app.listen(PORT, () => {
    logInfo('server.start', {
      port: Number(PORT),
      env: process.env.NODE_ENV || 'development',
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      bodyLimit: BODY_LIMIT,
      metricsEnabled: METRICS_ENABLED,
    });
  });
}).catch((err) => {
  logError('server.initDatabase.failed', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
