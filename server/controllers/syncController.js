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
        const { id, name, category, description, coverColor, coverImageUrl, isPublic, createdAt } = collection;

        const existing = await client.query('SELECT id FROM collections WHERE id = $1', [id]);

        if (existing.rows.length > 0) {
          // Update existing
          await client.query(
            `UPDATE collections
             SET name = $1, category = $2, description = $3, cover_color = $4, cover_image_url = $5, is_public = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND user_id = $8`,
            [name, category, description, coverColor, coverImageUrl, isPublic, id, userId]
          );
        } else {
          // Insert new
          await client.query(
            `INSERT INTO collections (id, user_id, name, category, description, cover_color, cover_image_url, is_public, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [id, userId, name, category, description, coverColor, coverImageUrl, isPublic, createdAt]
          );
        }
      }

      // Sync items
      for (const item of items) {
        const { id, collectionId, name, note, imageUrl, createdAt } = item;

        const existing = await client.query('SELECT id FROM items WHERE id = $1', [id]);

        if (existing.rows.length > 0) {
          // Update existing
          await client.query(
            `UPDATE items
             SET name = $1, note = $2, image_url = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [name, note, imageUrl, id]
          );
        } else {
          // Insert new
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

      // Update sync metadata
      const deviceId = req.body.deviceId || 'default';
      await client.query(
        `INSERT INTO sync_metadata (user_id, device_id, last_sync)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, device_id) DO UPDATE SET last_sync = CURRENT_TIMESTAMP`,
        [userId, deviceId]
      );

      await client.query('COMMIT');

      // Return synced state
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
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
};
