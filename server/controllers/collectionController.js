import pool from '../config/database.js';

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
  } catch (err) {
    console.error('Get collections error:', err);
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
  } catch (err) {
    console.error('Get public collections error:', err);
    res.status(500).json({ error: 'Failed to fetch public collections' });
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
  } catch (err) {
    console.error('Create collection error:', err);
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
  } catch (err) {
    console.error('Update collection error:', err);
    res.status(500).json({ error: 'Failed to update collection' });
  }
};

export const deleteCollection = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    // Verify ownership
    const ownership = await pool.query('SELECT user_id FROM collections WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this collection' });
    }

    await pool.query('DELETE FROM collections WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({ message: 'Collection deleted successfully' });
  } catch (err) {
    console.error('Delete collection error:', err);
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
  } catch (err) {
    console.error('Toggle public error:', err);
    res.status(500).json({ error: 'Failed to toggle collection visibility' });
  }
};
