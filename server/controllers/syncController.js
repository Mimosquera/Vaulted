import pool from '../config/database.js';

export const sync = async (req, res) => {
  try {
    const { userId } = req;
    const { collections = [], items = [], deletedCollectionIds = [], deletedItemIds = [] } = req.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Sync collections
      for (const collection of collections) {
        const { id, name, category, description, coverColor, coverImageUrl, isPublic, visibility, createdAt } = collection;
        const rawVisibility = typeof visibility === 'string'
          ? visibility
          : (isPublic ? 'public' : 'private');
        const normalizedVisibility = ['private', 'public', 'friends_only'].includes(rawVisibility)
          ? rawVisibility
          : 'private';

        const existing = await client.query('SELECT id FROM collections WHERE id = $1', [id]);

        if (existing.rows.length > 0) {
          // Update existing
          await client.query(
            `UPDATE collections
             SET name = $1, category = $2, description = $3, cover_color = $4, cover_image_url = $5, is_public = $6, visibility = $7, updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 AND user_id = $9`,
            [name, category, description, coverColor, coverImageUrl, normalizedVisibility === 'public', normalizedVisibility, id, userId]
          );
        } else {
          // Insert new
          await client.query(
            `INSERT INTO collections (id, user_id, name, category, description, cover_color, cover_image_url, is_public, visibility, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [id, userId, name, category, description, coverColor, coverImageUrl, normalizedVisibility === 'public', normalizedVisibility, createdAt]
          );
        }
      }

      for (const item of items) {
        const { id, collectionId, name, note, imageUrl, createdAt } = item;

        // make sure the collection is owned by this user before touching its items
        const ownerCheck = await client.query(
          'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
          [collectionId, userId]
        );
        if (ownerCheck.rows.length === 0) continue;

        const existing = await client.query('SELECT id FROM items WHERE id = $1', [id]);

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE items
             SET name = $1, note = $2, image_url = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 AND collection_id IN (SELECT id FROM collections WHERE user_id = $5)`,
            [name, note, imageUrl, id, userId]
          );
        } else {
          await client.query(
            `INSERT INTO items (id, collection_id, name, note, image_url, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, collectionId, name, note, imageUrl, createdAt]
          );
        }
      }

      // Delete collections
      for (const collectionId of deletedCollectionIds) {
        await client.query('DELETE FROM collections WHERE id = $1 AND user_id = $2', [collectionId, userId]);
      }

      // Delete items
      for (const itemId of deletedItemIds) {
        await client.query(
          `DELETE FROM items WHERE id = $1 AND collection_id IN (SELECT id FROM collections WHERE user_id = $2)`,
          [itemId, userId]
        );
      }

      // record last sync time
      const deviceId = req.body.deviceId || 'default';
      await client.query(
        `INSERT INTO sync_metadata (user_id, device_id, last_sync)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, device_id) DO UPDATE SET last_sync = CURRENT_TIMESTAMP`,
        [userId, deviceId]
      );

      await client.query('COMMIT');

      // fetch fresh state to return
      const syncedCollections = await client.query(
        'SELECT * FROM collections WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      const syncedItems = await client.query(
        `SELECT i.* FROM items i
         JOIN collections c ON i.collection_id = c.id
         WHERE c.user_id = $1
         ORDER BY i.updated_at DESC`,
        [userId]
      );

      res.json({
        message: 'Sync completed successfully',
        collections: syncedCollections.rows,
        items: syncedItems.rows,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch {
    res.status(500).json({ error: 'Sync failed' });
  }
};
