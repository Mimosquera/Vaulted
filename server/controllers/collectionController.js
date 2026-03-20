import pool from '../config/database.js';
import imageService from '../services/imageServiceFactory.js';

// Helper to extract Cloudinary public_id from secure_url
const extractCloudinaryPublicId = (url) => {
  if (!url) return null;
  // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{ext}
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
};

// Helper to convert snake_case DB response to camelCase
const toCamelCase = (obj) => {
  const camelCaseObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    camelCaseObj[camelKey] = value;
  }
  return camelCaseObj;
};

export const getCollections = async (req, res) => {
  try {
    const { userId } = req;

    const result = await pool.query(
      `SELECT c.*, COUNT(i.id) as item_count
       FROM collections c
       LEFT JOIN items i ON c.id = i.collection_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    res.json(result.rows.map(toCamelCase));
  } catch {
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

export const getPublicCollections = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.user_id, c.name, c.category, c.description, c.cover_color, c.cover_image_url, c.created_at,
              COUNT(i.id) as item_count, u.username
       FROM collections c
       LEFT JOIN items i ON c.id = i.collection_id
       JOIN users u ON c.user_id = u.id
       WHERE c.is_public = true
       GROUP BY c.id, u.username
       ORDER BY c.updated_at DESC
       LIMIT 20`
    );

    res.json(result.rows.map(toCamelCase));
  } catch {
    res.status(500).json({ error: 'Failed to fetch public collections' });
  }
};

export const getPublicCollection = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT c.id, c.name, c.category, c.description, c.cover_color, c.cover_image_url, c.created_at,
              u.username
       FROM collections c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1 AND c.is_public = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found or not public' });
    }

    const items = await pool.query(
      'SELECT id, name, note, image_url, created_at FROM items WHERE collection_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const collection = toCamelCase(result.rows[0]);
    collection.items = items.rows.map(toCamelCase);

    res.json(collection);
  } catch {
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
};

export const createCollection = async (req, res) => {
  try {
    const { userId } = req;
    const { id, name, category, description, coverColor, coverImageUrl, createdAt } = req.body;

    if (!id || !name || !category || !createdAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      `INSERT INTO collections (id, user_id, name, category, description, cover_color, cover_image_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, userId, name, category, description || null, coverColor || null, coverImageUrl || null, createdAt]
    );

    res.status(201).json(toCamelCase(result.rows[0]));
  } catch {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Collection with this ID already exists' });
    }
    res.status(500).json({ error: 'Failed to create collection' });
  }
};

export const updateCollection = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { name, category, description, coverColor, coverImageUrl } = req.body;

    // Verify ownership
    const ownership = await pool.query('SELECT user_id FROM collections WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this collection' });
    }

    const result = await pool.query(
      `UPDATE collections
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           cover_color = COALESCE($4, cover_color),
           cover_image_url = COALESCE($5, cover_image_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, category, description, coverColor, coverImageUrl, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json(toCamelCase(result.rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to update collection' });
  }
};

export const deleteCollection = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verify ownership
    const ownership = await pool.query('SELECT user_id, cover_image_url FROM collections WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this collection' });
    }

    // Get all items to clean up their images
    const items = await pool.query('SELECT image_url FROM items WHERE collection_id = $1', [id]);
    const imageIdsToDelete = [];

    // Add collection cover image if it exists
    if (ownership.rows[0].cover_image_url) {
      imageIdsToDelete.push(ownership.rows[0].cover_image_url);
    }

    // Add all item images
    items.rows.forEach((item) => {
      if (item.image_url) {
        imageIdsToDelete.push(item.image_url);
      }
    });

    // Delete images from cloud storage (non-blocking)
    imageIdsToDelete.forEach((imageUrl) => {
      if (imageUrl) {
        const publicId = extractCloudinaryPublicId(imageUrl);
        if (publicId) {
          imageService.delete(publicId).catch(() => {
            // Log cloud deletion failures but continue
          });
        }
      }
    });

    await pool.query('DELETE FROM collections WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({ message: 'Collection deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete collection' });
  }
};

export const togglePublic = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verify ownership
    const ownership = await pool.query('SELECT user_id, is_public FROM collections WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const newPublicStatus = !ownership.rows[0].is_public;

    const result = await pool.query(
      'UPDATE collections SET is_public = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newPublicStatus, id]
    );

    res.json(toCamelCase(result.rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to toggle collection visibility' });
  }
};
