import crypto from 'crypto';
import pool from '../config/database.js';
import imageService from '../services/imageServiceFactory.js';

export const uploadImage = async (req, res) => {
  try {
    const { userId } = req;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const imageId = crypto.randomUUID();

    const cloudResult = await imageService.upload(imageId, file.buffer, file.mimetype);
    const cloudUrl = cloudResult.secure_url || cloudResult.Location;

    const result = await pool.query(
      `INSERT INTO images (id, user_id, url, original_filename, mime_type, size)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET url = $3, original_filename = $4, mime_type = $5, size = $6
       RETURNING id, url`,
      [imageId, userId, cloudUrl, file.originalname, file.mimetype, file.size]
    );

    res.json({
      imageId: result.rows[0].id,
      url: result.rows[0].url,
    });
  } catch {
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const getImage = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT url, data, mime_type FROM images WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { url, data, mime_type } = result.rows[0];

    if (url) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.redirect(302, url);
    }

    if (data) {
      res.setHeader('Content-Type', mime_type || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(data);
    }

    return res.status(404).json({ error: 'Image data not found' });
  } catch {
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    const ownership = await pool.query('SELECT user_id FROM images WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    try {
      await imageService.delete(id);
    } catch {
      // Cloud deletion failed - still remove from DB
    }

    await pool.query('DELETE FROM images WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({ message: 'Image deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete image' });
  }
};
