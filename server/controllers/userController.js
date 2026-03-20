import pool from '../config/database.js';
import Joi from 'joi';
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
      `SELECT id, username, created_at, avatar_image_url, avatar_icon_color, bio
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

const updateProfileSchema = Joi.object({
  username: Joi.string().trim().min(2).max(30).optional(),
  avatarImageUrl: Joi.string().uri({ scheme: ['http', 'https'] }).allow(null).optional(),
  avatarIconColor: Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6})$/).optional(),
  bio: Joi.string().trim().max(180).allow('', null).optional(),
}).or('username', 'avatarImageUrl', 'avatarIconColor', 'bio');

export const updateMyProfile = async (req, res) => {
  try {
    const { userId } = req;
    const { error, value } = updateProfileSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Use hasOwnProperty to distinguish "explicitly set to null" from "not provided"
    const avatarImageUrlProvided = Object.prototype.hasOwnProperty.call(req.body, 'avatarImageUrl');
    const username = value.username !== undefined ? value.username : null;
    const avatarImageUrl = value.avatarImageUrl !== undefined ? value.avatarImageUrl : null;
    const avatarIconColor = value.avatarIconColor !== undefined ? value.avatarIconColor : null;
    const bio = value.bio !== undefined ? value.bio : null;

    const result = await pool.query(
      `UPDATE users
       SET username = COALESCE($1, username),
           avatar_image_url = CASE WHEN $6 THEN $2 ELSE avatar_image_url END,
           avatar_icon_color = COALESCE($3, avatar_icon_color),
           bio = CASE
             WHEN $4::text IS NULL THEN bio
             WHEN NULLIF(TRIM($4), '') IS NULL THEN NULL
             ELSE LEFT(TRIM($4), 180)
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, username, avatar_image_url, avatar_icon_color, bio`,
      [username, avatarImageUrl, avatarIconColor, bio, userId, avatarImageUrlProvided]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      avatarImageUrl: user.avatar_image_url,
      avatarIconColor: user.avatar_icon_color,
      bio: user.bio,
    });
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
