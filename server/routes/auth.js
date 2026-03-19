import express from 'express';
import { register, login, refreshToken } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', authMiddleware, refreshToken);

export default router;
