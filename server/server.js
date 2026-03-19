import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Routes
app.use('/auth', authRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/collections/:collectionId/items', itemRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/images', imageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Collection App Backend running' });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✓ Collection App Backend running on http://localhost:${PORT}`);
    console.log(`✓ CORS enabled for ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
