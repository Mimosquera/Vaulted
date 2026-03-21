import express from 'express';
import multer from 'multer';
import { uploadImage, getImage, deleteImage } from '../controllers/imageController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// multer keeps the file in memory, we pipe it straight to cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (within Cloudinary free tier)
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Supported: PNG, JPG, WebP, GIF'));
    }
  },
});

router.post('/', authMiddleware, upload.single('image'), uploadImage);
router.get('/:id', getImage);
router.delete('/:id', authMiddleware, deleteImage);

export default router;
