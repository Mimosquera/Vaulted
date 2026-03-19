import express from 'express';
import { sync } from '../controllers/syncController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, sync);

export default router;
