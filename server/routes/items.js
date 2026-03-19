import express from 'express';
import { getItems, addItem, updateItem, deleteItem } from '../controllers/itemController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.get('/', authMiddleware, getItems);
router.post('/', authMiddleware, addItem);
router.put('/:id', authMiddleware, updateItem);
router.delete('/:id', authMiddleware, deleteItem);

export default router;
