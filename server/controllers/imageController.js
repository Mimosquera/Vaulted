import pool from '../config/database.js';

export const uploadImage = async (req, res) => {
  try {
    const { userId } = req;
    const { id, data, mimeType } = req.body;

    if (!id || !data) {
      return res.status(400).json({ error: 'Image ID and data required' });
    }

    // Convert base64 to buffer if needed
    let imageBuffer = data;
    if (typeof data === 'string') {
      // Handle base64 or data URL
      const base64Data = data.includes('base64,') ? data.split('base64,')[1] : data;
      imageBuffer = Buffer.from(base64Data, 'base64');
    }

    const result = await pool.query(
      `INSERT INTO images (id, user_id, data, mime_type, size)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET data = $3, mime_type = $4, size = $5
       RETURNING id`,
      [id, userId, imageBuffer, mimeType || 'image/jpeg', imageBuffer.length]
    );

    res.json({
      message: 'Image uploaded successfully',
      imageId: result.rows[0].id,
      url: `/api/images/${result.rows[0].id}`,
    });
  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const getImage = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT data, mime_type FROM images WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { data, mime_type } = result.rows[0];

    res.setHeader('Content-Type', mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(data);
  } catch (err) {
    console.error('Get image error:', err);
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

    await pool.query('DELETE FROM images WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};
