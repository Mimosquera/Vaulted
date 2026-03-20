import express from 'express';
import {
  getCollections,
  getCollectionsWithItems,
  getPublicCollections,
  getPublicCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  togglePublic,
} from '../controllers/collectionController.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/public', getPublicCollections);
router.get('/public/:id', getPublicCollection);
router.get('/full', authMiddleware, getCollectionsWithItems);
router.get('/', authMiddleware, getCollections);
router.post('/', authMiddleware, createCollection);
router.put('/:id', authMiddleware, updateCollection);
router.delete('/:id', authMiddleware, deleteCollection);
router.post('/:id/toggle-public', authMiddleware, togglePublic);

export default router;
