import pool from '../config/database.js';
import { toCamelCase } from '../utils/helpers.js';

function buildVisibilityFilter(viewerId, ownerAlias = 'u', collectionAlias = 'c') {
  if (!viewerId) {
    return `${collectionAlias}.visibility = 'public'`;
  }

  return `(
    ${ownerAlias}.id = ${Number(viewerId)}
    OR ${collectionAlias}.visibility = 'public'
    OR (
      ${collectionAlias}.visibility = 'friends_only'
      AND EXISTS (
        SELECT 1
        FROM friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = ${ownerAlias}.id AND f.addressee_id = ${Number(viewerId)})
            OR (f.requester_id = ${Number(viewerId)} AND f.addressee_id = ${ownerAlias}.id))
      )
    )
  )`;
}

export const getPublicProfile = async (req, res) => {
  try {
    const requestedUserId = Number(req.params.userId);
    const viewerId = req.userId ? Number(req.userId) : null;

    if (!Number.isInteger(requestedUserId) || requestedUserId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await pool.query(
      `SELECT id, username, created_at
       FROM users
       WHERE id = $1`,
      [requestedUserId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const visibilityFilter = buildVisibilityFilter(viewerId, 'u', 'c');

    const collections = await pool.query(
      `SELECT c.id,
              c.name,
              c.category,
              c.description,
              c.cover_color,
              c.cover_image_url,
              c.visibility,
              c.created_at,
              COUNT(i.id) AS item_count
       FROM collections c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN items i ON i.collection_id = c.id
       WHERE u.id = $1
         AND ${visibilityFilter}
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [requestedUserId]
    );

    const relationResult = viewerId
      ? await pool.query(
        `SELECT status, requester_id, addressee_id
         FROM friendships
         WHERE (requester_id = $1 AND addressee_id = $2)
            OR (requester_id = $2 AND addressee_id = $1)
         LIMIT 1`,
        [viewerId, requestedUserId]
      )
      : { rows: [] };

    let friendshipStatus = 'none';
    if (relationResult.rows.length > 0) {
      const relation = relationResult.rows[0];
      if (relation.status === 'accepted') {
        friendshipStatus = 'accepted';
      } else if (relation.status === 'pending') {
        friendshipStatus = relation.requester_id === viewerId ? 'pending_outgoing' : 'pending_incoming';
      }
    }

    res.json({
      user: toCamelCase(user.rows[0]),
      isFriend: friendshipStatus === 'accepted',
      friendshipStatus,
      isSelf: viewerId === requestedUserId,
      collections: collections.rows.map((row) => {
        const mapped = toCamelCase(row);
        mapped.isPublic = mapped.visibility === 'public';
        return mapped;
      }),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
