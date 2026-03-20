import pool from './database.js';

export const initDatabase = async () => {
  try {
    console.log('Initializing database schema...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        username VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(36) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        cover_color VARCHAR(7),
        cover_image_url TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(36) PRIMARY KEY,
        collection_id VARCHAR(36) NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        note TEXT,
        image_url TEXT,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        device_id VARCHAR(100),
        UNIQUE(user_id, device_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (requester_id <> addressee_id)
      );
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);');
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_friendships_unique_pair ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));');

    try {
      await pool.query(`
        ALTER TABLE collections
        ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'private'
        CHECK (visibility IN ('private', 'public', 'friends_only'));
      `);
      console.log('✓ Added collections.visibility column');
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error('Error adding collections.visibility:', err.message);
      }
    }

    await pool.query(`
      UPDATE collections
      SET visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END
      WHERE visibility IS NULL OR visibility = '';
    `).catch(() => {});

    // Check if images table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'images'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create fresh images table
      await pool.query(`
        CREATE TABLE images (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          url TEXT NOT NULL,
          original_filename TEXT,
          mime_type TEXT,
          size INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created new images table');
    } else {
      // Table exists, check and migrate schema
      console.log('Images table exists, checking schema...');

      // Make data column nullable if it exists (old schema migration)
      try {
        await pool.query(`
          ALTER TABLE images ALTER COLUMN data DROP NOT NULL;
        `);
        console.log('✓ Made data column nullable');
      } catch (err) {
        // Column might not exist, that's fine
      }

      // Ensure url column exists and is NOT NULL for new uploads
      try {
        await pool.query(`
          ALTER TABLE images ADD COLUMN url TEXT NOT NULL DEFAULT '';
        `);
        console.log('✓ Added url column');
      } catch (err) {
        // Column might already exist
        if (!err.message.includes('already exists')) {
          console.error('Error adding url column:', err.message);
        }
      }

      // Add other columns if missing
      const otherColumns = [
        { name: 'original_filename', type: 'TEXT' },
        { name: 'mime_type', type: 'TEXT' },
        { name: 'size', type: 'INTEGER' }
      ];

      for (const col of otherColumns) {
        try {
          await pool.query(
            `ALTER TABLE images ADD COLUMN ${col.name} ${col.type};`
          );
          console.log(`✓ Added ${col.name} column`);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error(`Error adding ${col.name}:`, err.message);
          }
        }
      }
    }

    console.log('✓ Database schema initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    throw err;
  }
};

export default initDatabase;


