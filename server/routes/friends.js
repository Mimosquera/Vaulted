import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  searchUsers,
  sendFriendRequest,
  getFriendships,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '../controllers/friendsController.js';

const router = express.Router();

router.get('/search', authMiddleware, searchUsers);
router.get('/', authMiddleware, getFriendships);
router.post('/requests', authMiddleware, sendFriendRequest);
router.post('/requests/:id/accept', authMiddleware, acceptFriendRequest);
router.delete('/requests/:id', authMiddleware, rejectFriendRequest);
router.delete('/:userId', authMiddleware, removeFriend);

export default router;
