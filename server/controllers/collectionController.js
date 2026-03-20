import pool from '../config/database.js';
import imageService from '../services/imageServiceFactory.js';
import { toCamelCase, extractCloudinaryPublicId } from '../utils/helpers.js';
import { logError } from '../middleware/logger.js';

const VISIBILITY = new Set(['private', 'public', 'friends_only']);
let visibilitySchemaEnsured = false;
let visibilitySchemaPromise = null;
let visibilitySchemaAvailable = true;

function normalizeVisibility(input, fallback = 'private') {
  if (typeof input === 'string' && VISIBILITY.has(input)) return input;
  if (typeof input === 'boolean') return input ? 'public' : 'private';
  return fallback;
}

async function isAcceptedFriend(userA, userB) {
  if (!userA || !userB || Number(userA) === Number(userB)) return false;

  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1
      FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1))
    ) AS is_friend`,
    [userA, userB]
  );

  return result.rows[0]?.is_friend === true;
}

async function ensureVisibilitySchema() {
  if (visibilitySchemaEnsured) return;
  if (visibilitySchemaPromise) {
    await visibilitySchemaPromise;
    return;
  }

  visibilitySchemaPromise = (async () => {
    try {
      const columnCheck = await pool.query(
        `SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'collections' AND column_name = 'visibility'
        ) AS has_visibility`
      );

      if (!columnCheck.rows[0]?.has_visibility) {
        await pool.query(`
          ALTER TABLE collections
          ADD COLUMN IF NOT EXISTS visibility VARCHAR(20);
        `);

        await pool.query(`
          UPDATE collections
          SET visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END
          WHERE visibility IS NULL OR visibility = '';
        `);

        // Remove any legacy visibility constraints before applying the current canonical one.
        await pool.query(`
          DO $$
          DECLARE constraint_name TEXT;
          BEGIN
            FOR constraint_name IN
              SELECT c.conname
              FROM pg_constraint c
              JOIN pg_class t ON t.oid = c.conrelid
              WHERE t.relname = 'collections'
                AND c.contype = 'c'
                AND pg_get_constraintdef(c.oid) ILIKE '%visibility%'
            LOOP
              EXECUTE format('ALTER TABLE collections DROP CONSTRAINT %I', constraint_name);
            END LOOP;
          END
          $$;
        `);

        await pool.query(`
          ALTER TABLE collections
          ALTER COLUMN visibility SET DEFAULT 'private',
          ALTER COLUMN visibility SET NOT NULL;
        `);

        await pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_constraint
              WHERE conname = 'collections_visibility_check'
            ) THEN
              ALTER TABLE collections
              ADD CONSTRAINT collections_visibility_check
              CHECK (visibility IN ('private', 'public', 'friends_only'));
            END IF;
          END
          $$;
        `);
      }

      visibilitySchemaAvailable = true;
    } catch (err) {
      // Degrade gracefully to legacy is_public behavior instead of blocking requests.
      visibilitySchemaAvailable = false;
      logError('visibility.schema.ensure.failed', {
        error: err?.message || String(err),
        code: err?.code || null,
      });
    } finally {
      visibilitySchemaEnsured = true;
    }
  })();

  try {
    await visibilitySchemaPromise;
  } finally {
    visibilitySchemaPromise = null;
  }
}

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

    res.json(result.rows.map((row) => {
      const mapped = toCamelCase(row);
      mapped.visibility = normalizeVisibility(mapped.visibility, mapped.isPublic ? 'public' : 'private');
      mapped.isPublic = mapped.visibility === 'public';
      return mapped;
    }));
  } catch {
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

export const getCollectionsWithItems = async (req, res) => {
  try {
    const { userId } = req;

    const collections = await pool.query(
      'SELECT * FROM collections WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );

    const items = await pool.query(
      `SELECT i.* FROM items i
       JOIN collections c ON i.collection_id = c.id
       WHERE c.user_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    const itemsByCollection = {};
    for (const item of items.rows) {
      const collId = item.collection_id;
      if (!itemsByCollection[collId]) itemsByCollection[collId] = [];
      itemsByCollection[collId].push(toCamelCase(item));
    }

    const result = collections.rows.map((c) => {
      const col = toCamelCase(c);
      col.visibility = normalizeVisibility(col.visibility, col.isPublic ? 'public' : 'private');
      col.isPublic = col.visibility === 'public';
      col.items = itemsByCollection[c.id] || [];
      col.itemCount = col.items.length;
      return col;
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

export const getPublicCollections = async (req, res) => {
  try {
    await ensureVisibilitySchema();
    const viewerId = req.userId || null;

    if (!visibilitySchemaAvailable) {
      const legacy = await pool.query(
        `SELECT c.id, c.user_id, c.name, c.category, c.description, c.cover_color, c.cover_image_url,
                c.created_at, COUNT(i.id) as item_count, u.username
         FROM collections c
         LEFT JOIN items i ON c.id = i.collection_id
         JOIN users u ON c.user_id = u.id
         WHERE c.is_public = true
         GROUP BY c.id, u.username
         ORDER BY c.updated_at DESC
         LIMIT 40`
      );

      res.json(legacy.rows.map((row) => {
        const mapped = toCamelCase(row);
        mapped.visibility = 'public';
        mapped.isPublic = true;
        return mapped;
      }));
      return;
    }

    const result = await pool.query(
      `SELECT c.id, c.user_id, c.name, c.category, c.description, c.cover_color, c.cover_image_url, c.visibility, c.created_at,
              COUNT(i.id) as item_count, u.username
       FROM collections c
       LEFT JOIN items i ON c.id = i.collection_id
       JOIN users u ON c.user_id = u.id
       WHERE c.visibility = 'public'
          OR (
            $1::integer IS NOT NULL
            AND c.visibility = 'friends_only'
            AND EXISTS (
              SELECT 1
              FROM friendships f
              WHERE f.status = 'accepted'
                AND ((f.requester_id = c.user_id AND f.addressee_id = $1)
                  OR (f.requester_id = $1 AND f.addressee_id = c.user_id))
            )
          )
       GROUP BY c.id, u.username
       ORDER BY c.updated_at DESC
       LIMIT 40`,
      [viewerId]
    );

    res.json(result.rows.map((row) => {
      const mapped = toCamelCase(row);
      mapped.visibility = normalizeVisibility(mapped.visibility, mapped.isPublic ? 'public' : 'private');
      mapped.isPublic = mapped.visibility === 'public';
      return mapped;
    }));
  } catch {
    res.status(500).json({ error: 'Failed to fetch public collections' });
  }
};

export const getPublicCollection = async (req, res) => {
  try {
    await ensureVisibilitySchema();
    const { id } = req.params;
    const viewerId = req.userId || null;

    if (!visibilitySchemaAvailable) {
      const legacy = await pool.query(
        `SELECT c.id, c.name, c.category, c.description, c.cover_color, c.cover_image_url, c.created_at,
                c.user_id, u.username
         FROM collections c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = $1 AND c.is_public = true`,
        [id]
      );

      if (legacy.rows.length === 0) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const items = await pool.query(
        'SELECT id, name, note, image_url, created_at FROM items WHERE collection_id = $1 ORDER BY created_at DESC',
        [id]
      );

      const collection = toCamelCase(legacy.rows[0]);
      collection.visibility = 'public';
      collection.isPublic = true;
      collection.items = items.rows.map(toCamelCase);
      res.json(collection);
      return;
    }

    const result = await pool.query(
      `SELECT c.id, c.name, c.category, c.description, c.cover_color, c.cover_image_url, c.visibility, c.created_at,
              c.user_id, u.username
       FROM collections c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const collectionRow = result.rows[0];
    const visibility = normalizeVisibility(collectionRow.visibility, collectionRow.is_public ? 'public' : 'private');

    if (visibility === 'private') {
      return res.status(404).json({ error: 'Collection not found or not visible' });
    }

    if (visibility === 'friends_only') {
      const allowed = viewerId && await isAcceptedFriend(viewerId, collectionRow.user_id);
      if (!allowed) {
        return res.status(403).json({ error: 'Friends-only collection' });
      }
    }

    const items = await pool.query(
      'SELECT id, name, note, image_url, created_at FROM items WHERE collection_id = $1 ORDER BY created_at DESC',
      [id]
    );

    const collection = toCamelCase(collectionRow);
    collection.visibility = visibility;
    collection.isPublic = visibility === 'public';
    collection.items = items.rows.map(toCamelCase);

    res.json(collection);
  } catch {
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
};

export const createCollection = async (req, res) => {
  try {
    await ensureVisibilitySchema();
    const { userId } = req;
    const { id, name, category, description, coverColor, coverImageUrl, createdAt, visibility, isPublic } = req.body;

    if (!id || !name || !category || !createdAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const effectiveVisibility = normalizeVisibility(visibility, normalizeVisibility(isPublic, 'private'));

    if (!visibilitySchemaAvailable) {
      const legacy = await pool.query(
        `INSERT INTO collections (id, user_id, name, category, description, cover_color, cover_image_url, is_public, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [id, userId, name, category, description || null, coverColor || null, coverImageUrl || null, effectiveVisibility === 'public', createdAt]
      );

      const mapped = toCamelCase(legacy.rows[0]);
      mapped.visibility = effectiveVisibility === 'public' ? 'public' : 'private';
      mapped.isPublic = effectiveVisibility === 'public';
      res.status(201).json(mapped);
      return;
    }

    const result = await pool.query(
      `INSERT INTO collections (id, user_id, name, category, description, cover_color, cover_image_url, visibility, is_public, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, userId, name, category, description || null, coverColor || null, coverImageUrl || null, effectiveVisibility, effectiveVisibility === 'public', createdAt]
    );

    const mapped = toCamelCase(result.rows[0]);
    mapped.visibility = normalizeVisibility(mapped.visibility, mapped.isPublic ? 'public' : 'private');
    mapped.isPublic = mapped.visibility === 'public';
    res.status(201).json(mapped);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Collection with this ID already exists' });
    }
    res.status(500).json({ error: 'Failed to create collection' });
  }
};

export const updateCollection = async (req, res) => {
  try {
    await ensureVisibilitySchema();
    const { userId } = req;
    const { id } = req.params;
    const { name, category, description, coverColor, coverImageUrl, visibility, isPublic } = req.body;

    // Verify ownership
    const ownership = await pool.query('SELECT user_id FROM collections WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this collection' });
    }

    const effectiveVisibility = normalizeVisibility(visibility, normalizeVisibility(isPublic, null));
    const effectiveIsPublic = effectiveVisibility ? (effectiveVisibility === 'public') : null;

    if (!visibilitySchemaAvailable) {
      const legacyPublicValue = effectiveVisibility ? (effectiveVisibility === 'public') : null;
      const legacy = await pool.query(
        `UPDATE collections
         SET name = COALESCE($1, name),
             category = COALESCE($2, category),
             description = COALESCE($3, description),
             cover_color = COALESCE($4, cover_color),
             cover_image_url = COALESCE($5, cover_image_url),
             is_public = COALESCE($6, is_public),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND user_id = $8
         RETURNING *`,
        [name, category, description, coverColor, coverImageUrl, legacyPublicValue, id, userId]
      );

      if (legacy.rows.length === 0) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const mapped = toCamelCase(legacy.rows[0]);
      mapped.visibility = mapped.isPublic ? 'public' : 'private';
      mapped.isPublic = !!mapped.isPublic;
      res.json(mapped);
      return;
    }

    const result = await pool.query(
      `UPDATE collections
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           cover_color = COALESCE($4, cover_color),
           cover_image_url = COALESCE($5, cover_image_url),
           visibility = COALESCE($6, visibility),
           is_public = COALESCE($7, is_public),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [name, category, description, coverColor, coverImageUrl, effectiveVisibility, effectiveIsPublic, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const mapped = toCamelCase(result.rows[0]);
    mapped.visibility = normalizeVisibility(mapped.visibility, mapped.isPublic ? 'public' : 'private');
    mapped.isPublic = mapped.visibility === 'public';
    res.json(mapped);
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
    await ensureVisibilitySchema();
    const { userId } = req;
    const { id } = req.params;

    if (!visibilitySchemaAvailable) {
      const ownership = await pool.query('SELECT user_id, is_public FROM collections WHERE id = $1', [id]);
      if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const newPublicStatus = !ownership.rows[0].is_public;
      const result = await pool.query(
        'UPDATE collections SET is_public = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [newPublicStatus, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const mapped = toCamelCase(result.rows[0]);
      mapped.visibility = newPublicStatus ? 'public' : 'private';
      mapped.isPublic = newPublicStatus;
      res.json(mapped);
      return;
    }

    // Verify ownership
    const ownership = await pool.query('SELECT user_id, visibility, is_public FROM collections WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const currentVisibility = normalizeVisibility(
      ownership.rows[0].visibility,
      ownership.rows[0].is_public ? 'public' : 'private'
    );

    const newVisibility = currentVisibility === 'public' ? 'private' : 'public';

    const result = await pool.query(
      'UPDATE collections SET visibility = $1, is_public = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [newVisibility, newVisibility === 'public', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const mapped = toCamelCase(result.rows[0]);
    mapped.visibility = normalizeVisibility(mapped.visibility, mapped.isPublic ? 'public' : 'private');
    mapped.isPublic = mapped.visibility === 'public';
    res.json(mapped);
  } catch (err) {
    logError('collection.visibility.toggle.failed', {
      collectionId: req.params.id,
      userId: req.userId || null,
      error: err?.message || String(err),
      code: err?.code || null,
    });

    res.status(500).json({
      error: {
        message: 'Failed to toggle collection visibility',
        details: process.env.NODE_ENV === 'development' ? (err?.message || String(err)) : undefined,
      },
    });
  }
};

export const setCollectionVisibility = async (req, res) => {
  try {
    await ensureVisibilitySchema();
    const { userId } = req;
    const { id } = req.params;
    const visibility = normalizeVisibility(req.body.visibility, null);

    if (!visibility) {
      return res.status(400).json({ error: 'Invalid visibility option' });
    }

    const ownership = await pool.query('SELECT user_id FROM collections WHERE id = $1', [id]);
    if (ownership.rows.length === 0 || ownership.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!visibilitySchemaAvailable) {
      const fallbackPublic = visibility === 'public';
      const legacyUpdated = await pool.query(
        `UPDATE collections
         SET is_public = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [fallbackPublic, id]
      );

      if (legacyUpdated.rows.length === 0) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      const mapped = toCamelCase(legacyUpdated.rows[0]);
      mapped.visibility = fallbackPublic ? 'public' : 'private';
      mapped.isPublic = fallbackPublic;
      res.json(mapped);
      return;
    }

    const visibilityIsPublic = visibility === 'public';

    const updated = await pool.query(
      `UPDATE collections
       SET visibility = $1,
           is_public = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [visibility, visibilityIsPublic, id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const mapped = toCamelCase(updated.rows[0]);
    mapped.visibility = normalizeVisibility(mapped.visibility, mapped.isPublic ? 'public' : 'private');
    mapped.isPublic = mapped.visibility === 'public';
    res.json(mapped);
  } catch (err) {
    logError('collection.visibility.update.failed', {
      collectionId: req.params.id,
      userId: req.userId || null,
      visibility: req.body?.visibility || null,
      error: err?.message || String(err),
      code: err?.code || null,
    });

    res.status(500).json({
      error: {
        message: 'Failed to update collection visibility',
        details: process.env.NODE_ENV === 'development' ? (err?.message || String(err)) : undefined,
      },
    });
  }
};
