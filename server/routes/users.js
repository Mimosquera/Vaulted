import express from 'express';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { getPublicProfile, updateMyProfile } from '../controllers/userController.js';

const router = express.Router();

router.get('/:userId/profile', optionalAuth, getPublicProfile);
router.put('/me/profile', authMiddleware, updateMyProfile);

export default router;
