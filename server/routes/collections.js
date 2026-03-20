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
  setCollectionVisibility,
} from '../controllers/collectionController.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/public', optionalAuth, getPublicCollections);
router.get('/public/:id', optionalAuth, getPublicCollection);
router.get('/full', authMiddleware, getCollectionsWithItems);
router.get('/', authMiddleware, getCollections);
router.post('/', authMiddleware, createCollection);
router.put('/:id', authMiddleware, updateCollection);
router.delete('/:id', authMiddleware, deleteCollection);
router.post('/:id/toggle-public', authMiddleware, togglePublic);
router.put('/:id/visibility', authMiddleware, setCollectionVisibility);

export default router;
