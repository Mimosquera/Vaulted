import express from 'express';
import { uploadImage, getImage, deleteImage } from '../controllers/imageController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authMiddleware, uploadImage);
router.get('/:id', getImage);
router.delete('/:id', authMiddleware, deleteImage);

export default router;
