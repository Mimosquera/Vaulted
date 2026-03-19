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

export const getItems = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { userId } = req;

    // Verify ownership
    const ownership = await pool.query('SELECT user_id FROM collections WHERE id = $1', [collectionId]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query('SELECT * FROM items WHERE collection_id = $1 ORDER BY created_at DESC', [
      collectionId,
    ]);

    res.json(result.rows.map(toCamelCase));
  } catch (err) {
    console.error('Get items error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

export const addItem = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { userId } = req;
    const { id, name, note, imageUrl, createdAt } = req.body;

    if (!id || !name || !createdAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify collection ownership
    const ownership = await pool.query('SELECT user_id FROM collections WHERE id = $1', [collectionId]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `INSERT INTO items (id, collection_id, name, note, image_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, collectionId, name, note || null, imageUrl || null, createdAt]
    );

    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (err) {
    console.error('Add item error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Item with this ID already exists' });
    }
    res.status(500).json({ error: 'Failed to add item' });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;
    const { name, note, imageUrl } = req.body;

    // Verify ownership (via collection)
    const itemOwnership = await pool.query(
      `SELECT i.id, c.user_id FROM items i
       JOIN collections c ON i.collection_id = c.id
       WHERE i.id = $1`,
      [id]
    );

    if (itemOwnership.rows.length === 0 || itemOwnership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE items
       SET name = COALESCE($1, name),
           note = COALESCE($2, note),
           image_url = COALESCE($3, image_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, note, imageUrl, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(toCamelCase(result.rows[0]));
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req;

    // Verify ownership (via collection)
    const itemOwnership = await pool.query(
      `SELECT i.id, i.image_url, c.user_id FROM items i
       JOIN collections c ON i.collection_id = c.id
       WHERE i.id = $1`,
      [id]
    );

    if (itemOwnership.rows.length === 0 || itemOwnership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete image from cloud storage if it exists (non-blocking)
    const imageUrl = itemOwnership.rows[0].image_url;
    if (imageUrl) {
      const publicId = extractCloudinaryPublicId(imageUrl);
      if (publicId) {
        imageService.delete(publicId).catch(() => {
          // Log cloud deletion failures but continue
        });
      }
    }

    await pool.query('DELETE FROM items WHERE id = $1', [id]);

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};
