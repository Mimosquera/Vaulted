import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { getPublicProfile } from '../controllers/userController.js';

const router = express.Router();

router.get('/:userId/profile', optionalAuth, getPublicProfile);

export default router;
