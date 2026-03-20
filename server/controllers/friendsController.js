import Joi from 'joi';
import pool from '../config/database.js';
import { toCamelCase } from '../utils/helpers.js';

const requestSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
});

function normalizeFriendship(row, viewerId) {
  const outbound = row.requester_id === viewerId;
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    user: {
      id: outbound ? row.addressee_id : row.requester_id,
      username: outbound ? row.addressee_username : row.requester_username,
      email: outbound ? row.addressee_email : row.requester_email,
      avatarImageUrl: outbound ? row.addressee_avatar_image_url : row.requester_avatar_image_url,
      avatarIconColor: outbound ? row.addressee_avatar_icon_color : row.requester_avatar_icon_color,
      bio: outbound ? row.addressee_bio : row.requester_bio,
    },
    direction: outbound ? 'outgoing' : 'incoming',
  };
}

export const searchUsers = async (req, res) => {
  try {
    const { userId } = req;
    const q = String(req.query.q || '').trim();

    if (q.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_image_url, u.avatar_icon_color, u.bio,
              EXISTS (
                SELECT 1
                FROM friendships f
                WHERE (
                  (f.requester_id = $2 AND f.addressee_id = u.id)
                  OR
                  (f.requester_id = u.id AND f.addressee_id = $2)
                )
                AND f.status = 'accepted'
              ) AS is_friend,
              EXISTS (
                SELECT 1
                FROM friendships f
                WHERE (
                  (f.requester_id = $2 AND f.addressee_id = u.id)
                  OR
                  (f.requester_id = u.id AND f.addressee_id = $2)
                )
                AND f.status = 'pending'
              ) AS has_pending_request
       FROM users u
       WHERE u.id <> $2
         AND (LOWER(u.username) LIKE LOWER($1) OR LOWER(u.email) LIKE LOWER($1))
       ORDER BY u.username ASC
       LIMIT 20`,
      [`%${q}%`, userId]
    );

    res.json(result.rows.map(toCamelCase));
  } catch {
    res.status(500).json({ error: 'Failed to search users' });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req;
    const { error, value } = requestSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'Invalid user id' });

    const targetUserId = value.userId;

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const target = await pool.query('SELECT id FROM users WHERE id = $1', [targetUserId]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = await pool.query(
      `SELECT * FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)
       LIMIT 1`,
      [userId, targetUserId]
    );

    if (existing.rows.length > 0) {
      const relation = existing.rows[0];
      if (relation.status === 'accepted') {
        return res.status(409).json({ error: 'Already friends' });
      }

      if (relation.status === 'pending') {
        return res.status(409).json({ error: 'Friend request already pending' });
      }

      const reactivated = await pool.query(
        `UPDATE friendships
         SET requester_id = $1,
             addressee_id = $2,
             status = 'pending',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [userId, targetUserId, relation.id]
      );

      return res.status(201).json(toCamelCase(reactivated.rows[0]));
    }

    const inserted = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [userId, targetUserId]
    );

    res.status(201).json(toCamelCase(inserted.rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to send friend request' });
  }
};

export const getFriendships = async (req, res) => {
  try {
    const { userId } = req;

    const rows = await pool.query(
      `SELECT f.*,
              requester.username AS requester_username,
              requester.email AS requester_email,
              requester.avatar_image_url AS requester_avatar_image_url,
              requester.avatar_icon_color AS requester_avatar_icon_color,
              requester.bio AS requester_bio,
              addressee.username AS addressee_username,
              addressee.email AS addressee_email,
              addressee.avatar_image_url AS addressee_avatar_image_url,
              addressee.avatar_icon_color AS addressee_avatar_icon_color,
              addressee.bio AS addressee_bio
       FROM friendships f
       JOIN users requester ON requester.id = f.requester_id
       JOIN users addressee ON addressee.id = f.addressee_id
       WHERE f.requester_id = $1 OR f.addressee_id = $1
       ORDER BY f.updated_at DESC`,
      [userId]
    );

    const normalized = rows.rows.map((row) => normalizeFriendship(row, userId));

    res.json({
      friends: normalized.filter((f) => f.status === 'accepted'),
      incomingRequests: normalized.filter((f) => f.status === 'pending' && f.direction === 'incoming'),
      outgoingRequests: normalized.filter((f) => f.status === 'pending' && f.direction === 'outgoing'),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req;
    const friendshipId = Number(req.params.id);

    if (!Number.isInteger(friendshipId) || friendshipId <= 0) {
      return res.status(400).json({ error: 'Invalid friendship id' });
    }

    const updated = await pool.query(
      `UPDATE friendships
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
       RETURNING *`,
      [friendshipId, userId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    res.json(toCamelCase(updated.rows[0]));
  } catch {
    res.status(500).json({ error: 'Failed to accept request' });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { userId } = req;
    const friendshipId = Number(req.params.id);

    if (!Number.isInteger(friendshipId) || friendshipId <= 0) {
      return res.status(400).json({ error: 'Invalid friendship id' });
    }

    const removed = await pool.query(
      `DELETE FROM friendships
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
       RETURNING id`,
      [friendshipId, userId]
    );

    if (removed.rows.length === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const { userId } = req;
    const otherUserId = Number(req.params.userId);

    if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const removed = await pool.query(
      `DELETE FROM friendships
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND addressee_id = $2)
           OR (requester_id = $2 AND addressee_id = $1))
       RETURNING id`,
      [userId, otherUserId]
    );

    if (removed.rows.length === 0) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
};
