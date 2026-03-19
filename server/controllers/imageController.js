import pool from '../config/database.js';
import imageService from '../services/imageServiceFactory.js';

export const uploadImage = async (req, res) => {
  try {
    const { userId } = req;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Generate image ID from file
    const imageId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Upload to cloud storage (Cloudinary or S3)
    const cloudResult = await imageService.upload(imageId, file.buffer, file.mimetype);

    // Get the URL from cloud result
    const cloudUrl = cloudResult.secure_url || cloudResult.Location;

    // Store metadata in PostgreSQL (not binary data)
    const result = await pool.query(
      `INSERT INTO images (id, user_id, url, original_filename, mime_type, size)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET url = $3, original_filename = $4, mime_type = $5, size = $6
       RETURNING id, url`,
      [imageId, userId, cloudUrl, file.originalname, file.mimetype, file.size]
    );

    res.json({
      message: 'Image uploaded successfully',
      imageId: result.rows[0].id,
      url: result.rows[0].url,
    });
  } catch (err) {
    console.error('Upload image error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to upload image', details: err.message });
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

    // If we have a URL (new Cloudinary images), return it
    if (url) {
      return res.json({ url });
    }

    // If we have binary data (old local images), return it directly
    if (data) {
      res.setHeader('Content-Type', mime_type || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.send(data);
    }

    return res.status(404).json({ error: 'Image data not found' });
  } catch (err) {
    console.error('Get image error:', err);
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verify ownership
    const ownership = await pool.query('SELECT user_id FROM images WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete from cloud storage
    try {
      await imageService.delete(id);
    } catch (cloudErr) {
      // Log but don't fail if cloud deletion fails - still remove from DB
      console.error('Cloud deletion error:', cloudErr);
    }

    // Delete from database
    await pool.query('DELETE FROM images WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};
